from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import zipfile
import logging
import secrets
import base64
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import pyotp
import qrcode
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Header, Query
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------- Config ----------------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
APP_NAME = os.environ.get("APP_NAME", "medipassport")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("medipassport")

app = FastAPI(title="MediPassport")
api = APIRouter(prefix="/api")

# ---------------- Storage ----------------
_storage_key = None

def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

# ---------------- Utils ----------------
def now_utc():
    return datetime.now(timezone.utc)

def iso(dt=None):
    return (dt or now_utc()).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, session_id: str) -> str:
    return jwt.encode({
        "sub": user_id, "sid": session_id,
        "exp": now_utc() + timedelta(hours=2), "type": "access"
    }, JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(user_id: str, session_id: str) -> str:
    return jwt.encode({
        "sub": user_id, "sid": session_id,
        "exp": now_utc() + timedelta(days=30), "type": "refresh"
    }, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookies(resp: Response, at: str, rt: str):
    resp.set_cookie("access_token", at, httponly=True, secure=True, samesite="none", max_age=7200, path="/")
    resp.set_cookie("refresh_token", rt, httponly=True, secure=True, samesite="none", max_age=2592000, path="/")

def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")

async def audit(user_id: str, action: str, target: str = "", meta: dict = None, ip: str = "", ua: str = ""):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "ip": ip,
        "user_agent": ua,
        "created_at": iso(),
    })

def get_ip(req: Request) -> str:
    xf = req.headers.get("x-forwarded-for", "")
    return xf.split(",")[0].strip() if xf else (req.client.host if req.client else "")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_h = request.headers.get("Authorization", "")
        if auth_h.startswith("Bearer "):
            token = auth_h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        sid = payload.get("sid")
        session = await db.sessions.find_one({"id": sid, "revoked": False})
        if not session:
            raise HTTPException(401, "Session revoked")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        user.pop("totp_secret", None)
        user.pop("backup_codes", None)
        user["session_id"] = sid
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ---------------- Models ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8)

class Enable2FAIn(BaseModel):
    totp_code: str

class Disable2FAIn(BaseModel):
    password: str

class ProfileIn(BaseModel):
    name: str
    relationship: str = "self"
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None

class HealthIn(BaseModel):
    blood_group: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []
    medications: List[str] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None

class ShareIn(BaseModel):
    profile_id: str
    record_ids: List[str]
    expires_in_hours: int = 24
    pin: Optional[str] = None
    label: Optional[str] = None

# ---------------- Auth Endpoints ----------------
@api.post("/auth/register")
async def register(payload: RegisterIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid, "email": email, "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "user", "twofa_enabled": False, "totp_secret": None,
        "backup_codes": [],
        "created_at": iso(),
    }
    await db.users.insert_one(user)
    # default profile
    pid = str(uuid.uuid4())
    await db.profiles.insert_one({
        "id": pid, "user_id": uid, "name": payload.name.strip(),
        "relationship": "self", "date_of_birth": None, "gender": None,
        "health": {"blood_group": None, "allergies": [], "conditions": [],
                    "medications": [], "emergency_contact_name": None,
                    "emergency_contact_phone": None, "notes": None},
        "created_at": iso(),
    })
    sid = str(uuid.uuid4())
    ip = get_ip(request); ua = request.headers.get("user-agent", "")
    await db.sessions.insert_one({
        "id": sid, "user_id": uid, "ip": ip, "user_agent": ua,
        "created_at": iso(), "last_seen": iso(), "revoked": False,
    })
    at = create_access_token(uid, sid); rt = create_refresh_token(uid, sid)
    await audit(uid, "auth.register", meta={"email": email}, ip=ip, ua=ua)
    await audit(uid, "auth.login", ip=ip, ua=ua)
    set_auth_cookies(response, at, rt)
    return {"id": uid, "email": email, "name": payload.name, "twofa_enabled": False, "access_token": at}

@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = get_ip(request); ua = request.headers.get("user-agent", "")
    identifier = f"{ip}:{email}"
    # brute force check
    la = await db.login_attempts.find_one({"identifier": identifier})
    if la and la.get("count", 0) >= 5 and la.get("locked_until"):
        try:
            if datetime.fromisoformat(la["locked_until"]) > now_utc():
                raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
        except ValueError:
            pass
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": iso(now_utc() + timedelta(minutes=15))}},
            upsert=True)
        raise HTTPException(401, "Invalid credentials")
    # 2FA check
    if user.get("twofa_enabled"):
        if payload.backup_code:
            codes = user.get("backup_codes", [])
            match = None
            for c in codes:
                if not c.get("used") and c.get("code") == payload.backup_code.strip().upper():
                    match = c; break
            if not match:
                raise HTTPException(401, "Invalid backup code")
            await db.users.update_one({"id": user["id"], "backup_codes.code": match["code"]},
                                      {"$set": {"backup_codes.$.used": True, "backup_codes.$.used_at": iso()}})
        elif payload.totp_code:
            totp = pyotp.TOTP(user["totp_secret"])
            if not totp.verify(payload.totp_code, valid_window=1):
                raise HTTPException(401, "Invalid 2FA code")
        else:
            return JSONResponse({"twofa_required": True}, status_code=200)
    await db.login_attempts.delete_one({"identifier": identifier})
    sid = str(uuid.uuid4())
    await db.sessions.insert_one({
        "id": sid, "user_id": user["id"], "ip": ip, "user_agent": ua,
        "created_at": iso(), "last_seen": iso(), "revoked": False,
    })
    at = create_access_token(user["id"], sid); rt = create_refresh_token(user["id"], sid)
    await audit(user["id"], "auth.login", ip=ip, ua=ua)
    set_auth_cookies(response, at, rt)
    return {"id": user["id"], "email": user["email"], "name": user["name"],
            "twofa_enabled": user.get("twofa_enabled", False), "access_token": at}

@api.post("/auth/logout")
async def logout(request: Request, response: Response, user=Depends(get_current_user)):
    await db.sessions.update_one({"id": user["session_id"]}, {"$set": {"revoked": True, "revoked_at": iso()}})
    await audit(user["id"], "auth.logout", ip=get_ip(request), ua=request.headers.get("user-agent", ""))
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"],
            "twofa_enabled": user.get("twofa_enabled", False),
            "role": user.get("role", "user")}

@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token")
        sid = payload.get("sid")
        session = await db.sessions.find_one({"id": sid, "revoked": False})
        if not session:
            raise HTTPException(401, "Session revoked")
        at = create_access_token(payload["sub"], sid)
        response.set_cookie("access_token", at, httponly=True, secure=True, samesite="none", max_age=7200, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

@api.post("/auth/forgot-password")
async def forgot(payload: ForgotIn):
    user = await db.users.find_one({"email": payload.email.lower().strip()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": iso(now_utc() + timedelta(hours=1)),
            "used": False, "created_at": iso(),
        })
        logger.info(f"Password reset for {payload.email}: {FRONTEND_URL}/reset-password?token={token}")
    return {"ok": True, "message": "If an account exists, a reset link has been sent."}

@api.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    doc = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not doc:
        raise HTTPException(400, "Invalid or used token")
    if datetime.fromisoformat(doc["expires_at"]) < now_utc():
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}

# ---------- 2FA ----------
@api.post("/auth/2fa/setup")
async def twofa_setup(user=Depends(get_current_user)):
    secret = pyotp.random_base32()
    otpauth = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="MediPassport")
    img = qrcode.make(otpauth)
    buf = io.BytesIO(); img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    backup_codes = [{"code": secrets.token_hex(4).upper(), "used": False} for _ in range(10)]
    await db.users.update_one({"id": user["id"]},
        {"$set": {"totp_secret_pending": secret, "backup_codes_pending": backup_codes}})
    return {"secret": secret, "otpauth_url": otpauth,
            "qr_code": f"data:image/png;base64,{qr_b64}",
            "backup_codes": [c["code"] for c in backup_codes]}

@api.post("/auth/2fa/enable")
async def twofa_enable(payload: Enable2FAIn, request: Request, user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]})
    pending = u.get("totp_secret_pending")
    if not pending:
        raise HTTPException(400, "Run setup first")
    if not pyotp.TOTP(pending).verify(payload.totp_code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    await db.users.update_one({"id": user["id"]}, {
        "$set": {"twofa_enabled": True, "totp_secret": pending,
                 "backup_codes": u.get("backup_codes_pending", [])},
        "$unset": {"totp_secret_pending": "", "backup_codes_pending": ""}
    })
    await audit(user["id"], "security.2fa_enabled", ip=get_ip(request))
    return {"ok": True}

@api.post("/auth/2fa/disable")
async def twofa_disable(payload: Disable2FAIn, request: Request, user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]})
    if not verify_password(payload.password, u["password_hash"]):
        raise HTTPException(401, "Invalid password")
    await db.users.update_one({"id": user["id"]},
        {"$set": {"twofa_enabled": False, "totp_secret": None, "backup_codes": []}})
    await audit(user["id"], "security.2fa_disabled", ip=get_ip(request))
    return {"ok": True}

# ---------- Sessions ----------
@api.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    docs = await db.sessions.find({"user_id": user["id"], "revoked": False}).sort("last_seen", -1).to_list(100)
    return [{"id": d["id"], "ip": d.get("ip", ""), "user_agent": d.get("user_agent", ""),
             "created_at": d["created_at"], "last_seen": d.get("last_seen", d["created_at"]),
             "current": d["id"] == user["session_id"]} for d in docs]

@api.delete("/sessions/{sid}")
async def revoke_session(sid: str, request: Request, user=Depends(get_current_user)):
    r = await db.sessions.update_one({"id": sid, "user_id": user["id"]},
                                     {"$set": {"revoked": True, "revoked_at": iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Session not found")
    await audit(user["id"], "security.session_revoked", target=sid, ip=get_ip(request))
    return {"ok": True}

@api.post("/sessions/revoke-all")
async def revoke_all(request: Request, user=Depends(get_current_user)):
    await db.sessions.update_many(
        {"user_id": user["id"], "id": {"$ne": user["session_id"]}, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": iso()}})
    await audit(user["id"], "security.revoke_all_sessions", ip=get_ip(request))
    return {"ok": True}

# ---------- Profiles ----------
@api.get("/profiles")
async def list_profiles(user=Depends(get_current_user)):
    docs = await db.profiles.find({"user_id": user["id"]}).sort("created_at", 1).to_list(50)
    for d in docs:
        d.pop("_id", None)
    return docs

@api.post("/profiles")
async def create_profile(payload: ProfileIn, request: Request, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())
    doc = {"id": pid, "user_id": user["id"], "name": payload.name.strip(),
           "relationship": payload.relationship, "date_of_birth": payload.date_of_birth,
           "gender": payload.gender,
           "health": {"blood_group": None, "allergies": [], "conditions": [],
                       "medications": [], "emergency_contact_name": None,
                       "emergency_contact_phone": None, "notes": None},
           "created_at": iso()}
    await db.profiles.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["id"], "profile.created", target=pid, ip=get_ip(request))
    return doc

@api.patch("/profiles/{pid}")
async def update_profile(pid: str, payload: ProfileIn, user=Depends(get_current_user)):
    r = await db.profiles.update_one({"id": pid, "user_id": user["id"]},
        {"$set": {"name": payload.name, "relationship": payload.relationship,
                  "date_of_birth": payload.date_of_birth, "gender": payload.gender}})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api.delete("/profiles/{pid}")
async def delete_profile(pid: str, request: Request, user=Depends(get_current_user)):
    prof = await db.profiles.find_one({"id": pid, "user_id": user["id"]})
    if not prof:
        raise HTTPException(404, "Not found")
    if prof.get("relationship") == "self":
        raise HTTPException(400, "Cannot delete primary profile")
    await db.profiles.delete_one({"id": pid})
    await db.records.update_many({"profile_id": pid}, {"$set": {"is_deleted": True}})
    await audit(user["id"], "profile.deleted", target=pid, ip=get_ip(request))
    return {"ok": True}

@api.post("/profiles/{pid}/health")
async def update_health(pid: str, payload: HealthIn, user=Depends(get_current_user)):
    r = await db.profiles.update_one({"id": pid, "user_id": user["id"]},
        {"$set": {"health": payload.model_dump()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# ---------- Records ----------
MAX_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_MIMES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}
CATEGORIES = ["Prescriptions", "Lab Reports", "Imaging", "Vaccinations", "Insurance", "Other"]

@api.get("/records")
async def list_records(profile_id: Optional[str] = None, category: Optional[str] = None,
                       q: Optional[str] = None, user=Depends(get_current_user)):
    query = {"user_id": user["id"], "is_deleted": False}
    if profile_id: query["profile_id"] = profile_id
    if category and category != "All": query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"doctor": {"$regex": q, "$options": "i"}},
            {"hospital": {"$regex": q, "$options": "i"}},
            {"notes": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.records.find(query).sort("record_date", -1).to_list(500)
    for d in docs:
        d.pop("_id", None); d.pop("storage_path", None)
    return docs

@api.post("/records")
async def upload_record(
    request: Request,
    file: UploadFile = File(...),
    profile_id: str = Form(...),
    title: str = Form(...),
    category: str = Form(...),
    doctor: str = Form(""),
    hospital: str = Form(""),
    record_date: str = Form(""),
    tags: str = Form(""),
    notes: str = Form(""),
    user=Depends(get_current_user)
):
    if category not in CATEGORIES:
        raise HTTPException(400, "Invalid category")
    prof = await db.profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not prof:
        raise HTTPException(404, "Profile not found")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File exceeds 25MB")
    ctype = file.content_type or "application/octet-stream"
    if ctype not in ALLOWED_MIMES:
        raise HTTPException(400, f"Unsupported file type: {ctype}")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    rid = str(uuid.uuid4())
    path = f"{APP_NAME}/users/{user['id']}/{rid}.{ext}"
    result = put_object(path, content, ctype)
    doc = {
        "id": rid, "user_id": user["id"], "profile_id": profile_id,
        "title": title.strip(), "category": category,
        "doctor": doctor.strip(), "hospital": hospital.strip(),
        "record_date": record_date or iso(),
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "notes": notes.strip(),
        "filename": file.filename, "content_type": ctype,
        "size": result.get("size", len(content)),
        "storage_path": result["path"],
        "is_deleted": False, "created_at": iso(),
    }
    await db.records.insert_one(doc)
    await audit(user["id"], "record.uploaded", target=rid,
                meta={"title": title, "category": category}, ip=get_ip(request))
    doc.pop("_id", None); doc.pop("storage_path", None)
    return doc

@api.get("/records/{rid}")
async def get_record(rid: str, user=Depends(get_current_user)):
    doc = await db.records.find_one({"id": rid, "user_id": user["id"], "is_deleted": False})
    if not doc:
        raise HTTPException(404, "Not found")
    doc.pop("_id", None); doc.pop("storage_path", None)
    return doc

@api.get("/records/{rid}/download")
async def download_record(rid: str, request: Request, user=Depends(get_current_user)):
    doc = await db.records.find_one({"id": rid, "user_id": user["id"], "is_deleted": False})
    if not doc:
        raise HTTPException(404, "Not found")
    data, ctype = get_object(doc["storage_path"])
    await audit(user["id"], "record.downloaded", target=rid, ip=get_ip(request))
    return Response(content=data, media_type=doc.get("content_type", ctype),
                    headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'})

@api.delete("/records/{rid}")
async def delete_record(rid: str, request: Request, user=Depends(get_current_user)):
    r = await db.records.update_one({"id": rid, "user_id": user["id"]},
                                    {"$set": {"is_deleted": True, "deleted_at": iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    await audit(user["id"], "record.deleted", target=rid, ip=get_ip(request))
    return {"ok": True}

# ---------- Share Links ----------
@api.get("/shares")
async def list_shares(user=Depends(get_current_user)):
    docs = await db.shares.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    now = now_utc()
    result = []
    for d in docs:
        d.pop("_id", None)
        d.pop("pin_hash", None)
        expired = datetime.fromisoformat(d["expires_at"]) < now
        d["expired"] = expired
        d["status"] = "revoked" if d.get("revoked") else ("expired" if expired else "active")
        result.append(d)
    return result

@api.post("/shares")
async def create_share(payload: ShareIn, request: Request, user=Depends(get_current_user)):
    prof = await db.profiles.find_one({"id": payload.profile_id, "user_id": user["id"]})
    if not prof:
        raise HTTPException(404, "Profile not found")
    valid_records = await db.records.count_documents({
        "id": {"$in": payload.record_ids}, "user_id": user["id"], "is_deleted": False})
    if valid_records != len(payload.record_ids):
        raise HTTPException(400, "Some records invalid")
    token = secrets.token_urlsafe(24)
    sid = str(uuid.uuid4())
    doc = {
        "id": sid, "user_id": user["id"], "profile_id": payload.profile_id,
        "token": token, "record_ids": payload.record_ids,
        "label": payload.label or f"Share {datetime.now().strftime('%b %d')}",
        "pin_hash": hash_password(payload.pin) if payload.pin else None,
        "has_pin": bool(payload.pin),
        "expires_at": iso(now_utc() + timedelta(hours=payload.expires_in_hours)),
        "created_at": iso(), "revoked": False, "access_count": 0,
    }
    await db.shares.insert_one(doc)
    await audit(user["id"], "share.created", target=sid,
                meta={"records": len(payload.record_ids), "hours": payload.expires_in_hours},
                ip=get_ip(request))
    doc.pop("_id", None); doc.pop("pin_hash", None)
    return doc

@api.post("/shares/{sid}/revoke")
async def revoke_share(sid: str, request: Request, user=Depends(get_current_user)):
    r = await db.shares.update_one({"id": sid, "user_id": user["id"]},
                                   {"$set": {"revoked": True, "revoked_at": iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    await audit(user["id"], "share.revoked", target=sid, ip=get_ip(request))
    return {"ok": True}

# ---------- Public Share View ----------
@api.get("/public/share/{token}")
async def public_share(token: str, request: Request, pin: Optional[str] = Query(None)):
    share = await db.shares.find_one({"token": token})
    if not share:
        raise HTTPException(404, "Share not found")
    if share.get("revoked"):
        raise HTTPException(410, "Share revoked")
    if datetime.fromisoformat(share["expires_at"]) < now_utc():
        raise HTTPException(410, "Share expired")
    if share.get("has_pin"):
        if not pin:
            return {"pin_required": True, "label": share.get("label", "Medical Records")}
        if not verify_password(pin, share["pin_hash"]):
            raise HTTPException(401, "Invalid PIN")
    prof = await db.profiles.find_one({"id": share["profile_id"]})
    records = await db.records.find({"id": {"$in": share["record_ids"]}, "is_deleted": False}).to_list(100)
    for r in records:
        r.pop("_id", None); r.pop("storage_path", None)
    await db.shares.update_one({"id": share["id"]},
        {"$inc": {"access_count": 1}, "$set": {"last_accessed": iso()}})
    await audit(share["user_id"], "share.accessed", target=share["id"],
                meta={"ip": get_ip(request)}, ip=get_ip(request),
                ua=request.headers.get("user-agent", ""))
    return {
        "profile": {"name": prof["name"], "relationship": prof["relationship"],
                    "health": prof.get("health", {})} if prof else None,
        "records": records,
        "expires_at": share["expires_at"],
        "label": share.get("label", "Medical Records"),
    }

@api.get("/public/share/{token}/record/{rid}")
async def public_share_record(token: str, rid: str, request: Request, pin: Optional[str] = Query(None)):
    share = await db.shares.find_one({"token": token})
    if not share or share.get("revoked"):
        raise HTTPException(404, "Not available")
    if datetime.fromisoformat(share["expires_at"]) < now_utc():
        raise HTTPException(410, "Expired")
    if share.get("has_pin"):
        if not pin or not verify_password(pin, share["pin_hash"]):
            raise HTTPException(401, "PIN required")
    if rid not in share["record_ids"]:
        raise HTTPException(404, "Not in share")
    rec = await db.records.find_one({"id": rid, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "Not found")
    data, ctype = get_object(rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type", ctype))

# ---------- Audit ----------
@api.get("/audit")
async def get_audit(limit: int = 100, user=Depends(get_current_user)):
    docs = await db.audit_logs.find({"user_id": user["id"]}).sort("created_at", -1).to_list(limit)
    for d in docs:
        d.pop("_id", None)
    return docs

# ---------- Export ----------
@api.get("/export")
async def export_all(request: Request, user=Depends(get_current_user)):
    profiles = await db.profiles.find({"user_id": user["id"]}).to_list(50)
    records = await db.records.find({"user_id": user["id"], "is_deleted": False}).to_list(500)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        import json
        prof_data = [{k: v for k, v in p.items() if k != "_id"} for p in profiles]
        z.writestr("profiles.json", json.dumps(prof_data, indent=2, default=str))
        rec_meta = [{k: v for k, v in r.items() if k not in ("_id", "storage_path")} for r in records]
        z.writestr("records.json", json.dumps(rec_meta, indent=2, default=str))
        for r in records:
            try:
                data, _ = get_object(r["storage_path"])
                z.writestr(f"records/{r['category']}/{r['id']}_{r['filename']}", data)
            except Exception as e:
                logger.warning(f"Skipped {r['id']}: {e}")
    buf.seek(0)
    await audit(user["id"], "data.exported", ip=get_ip(request))
    return StreamingResponse(buf, media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="medipassport-export-{datetime.now().strftime("%Y%m%d")}.zip"'})

# ---------- Health ----------
@api.get("/health")
async def health():
    return {"status": "ok", "time": iso()}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.environ.get('CORS_ORIGINS', '*') == '*' else os.environ['CORS_ORIGINS'].split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Startup ----------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_email or not admin_pw:
        return
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": admin_email, "name": "Lochan Awasthi",
            "password_hash": hash_password(admin_pw),
            "role": "owner", "twofa_enabled": False, "totp_secret": None,
            "backup_codes": [], "created_at": iso(),
        })
        # seed demo profiles
        for name, rel, dob, gender in [
            ("Lochan Awasthi", "self", "1990-05-14", "prefer-not-to-say"),
            ("Maya", "daughter", "2018-08-22", "female"),
            ("Robert", "parent", "1958-11-03", "male"),
        ]:
            await db.profiles.insert_one({
                "id": str(uuid.uuid4()), "user_id": uid, "name": name,
                "relationship": rel, "date_of_birth": dob, "gender": gender,
                "health": {
                    "blood_group": "O+" if rel == "self" else ("A+" if rel == "daughter" else "B+"),
                    "allergies": ["Penicillin"] if rel == "self" else [],
                    "conditions": [] if rel != "parent" else ["Hypertension", "Type 2 Diabetes"],
                    "medications": [] if rel != "parent" else ["Metformin 500mg", "Amlodipine 5mg"],
                    "emergency_contact_name": "Sarah Awasthi",
                    "emergency_contact_phone": "+1-555-0142",
                    "notes": None,
                },
                "created_at": iso(),
            })
        logger.info(f"Seeded owner: {admin_email}")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw)}})

@app.on_event("startup")
async def on_start():
    await db.users.create_index("email", unique=True)
    await db.profiles.create_index("user_id")
    await db.records.create_index([("user_id", 1), ("profile_id", 1)])
    await db.shares.create_index("token", unique=True)
    await db.sessions.create_index("user_id")
    await db.audit_logs.create_index([("user_id", 1), ("created_at", -1)])
    await db.login_attempts.create_index("identifier")
    init_storage()
    await seed_admin()
    logger.info("MediPassport backend ready")

@app.on_event("shutdown")
async def on_stop():
    client.close()
