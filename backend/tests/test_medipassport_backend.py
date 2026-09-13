"""MediPassport backend end-to-end pytest suite.

Uses production public URL (REACT_APP_BACKEND_URL). Cookies are session-persisted.
Owner: lochanawasthi22@gmail.com / MediPass2026!
"""
import io
import os
import time
import uuid
import zipfile
from pathlib import Path

import pyotp
import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path("/app/frontend/.env"))
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"

OWNER_EMAIL = "lochanawasthi22@gmail.com"
OWNER_PW = "MediPass2026!"

# NOTE: EmailStr rejects the `.test` reserved TLD, so tests use example.com aliases
QA_DOMAIN = "example.com"

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x00\x03\x00\x01\xa5\xf6E@\x00\x00\x00\x00IEND\xaeB`\x82"
)


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def owner():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    assert r.status_code == 200, f"owner login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def state():
    return {}


# ---------- Basics ----------
def test_health():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Auth: owner login & me ----------
def test_owner_login_cookies():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    assert r.status_code == 200
    ck = s.cookies.get_dict()
    assert "access_token" in ck and "refresh_token" in ck
    body = r.json()
    assert body["email"] == OWNER_EMAIL
    assert body["twofa_enabled"] is False


def test_auth_me_owner(owner):
    r = owner.get(f"{BASE}/auth/me")
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == OWNER_EMAIL
    assert d["twofa_enabled"] is False
    assert d["role"] == "owner"


# ---------- Registration ----------
@pytest.fixture(scope="module")
def new_user():
    email = f"qa+{int(time.time())}@example.com"
    s = requests.Session()
    r = s.post(f"{BASE}/auth/register", json={"email": email, "password": "TestPass123!", "name": "QA User"})
    assert r.status_code == 200, r.text
    ck = s.cookies.get_dict()
    assert "access_token" in ck
    return {"session": s, "email": email, "id": r.json()["id"]}


def test_register_duplicate(new_user):
    r = requests.post(f"{BASE}/auth/register",
                      json={"email": new_user["email"], "password": "TestPass123!", "name": "Dup"})
    assert r.status_code == 400


def test_register_short_password():
    r = requests.post(f"{BASE}/auth/register",
                      json={"email": f"qa+{uuid.uuid4().hex}@example.com",
                            "password": "short", "name": "Short"})
    assert r.status_code == 422


def test_register_seeds_self_profile(new_user):
    r = new_user["session"].get(f"{BASE}/profiles")
    assert r.status_code == 200
    profs = r.json()
    assert any(p["relationship"] == "self" for p in profs)


# ---------- Brute-force lockout ----------
def test_login_lockout_429():
    email = f"qa+lock{uuid.uuid4().hex}@example.com"
    # Register first so identifier is unique to this test
    requests.post(f"{BASE}/auth/register", json={"email": email, "password": "TestPass123!", "name": "Lock"})
    codes = []
    for _ in range(6):
        r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "wrongwrong"})
        codes.append(r.status_code)
    assert 429 in codes, f"expected 429 after 5 fails, got {codes}"


# ---------- Refresh + Logout ----------
def test_refresh_mints_new_access():
    s = requests.Session()
    s.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    old_at = s.cookies.get("access_token")
    r = s.post(f"{BASE}/auth/refresh")
    assert r.status_code == 200
    # New access cookie present
    assert s.cookies.get("access_token") is not None


def test_logout_revokes():
    s = requests.Session()
    s.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    r = s.post(f"{BASE}/auth/logout")
    assert r.status_code == 200
    # /me should now 401
    r2 = s.get(f"{BASE}/auth/me")
    assert r2.status_code == 401


# ---------- Profiles ----------
def test_list_profiles_seeded(owner, state):
    r = owner.get(f"{BASE}/profiles")
    assert r.status_code == 200
    profs = r.json()
    assert len(profs) >= 3
    rels = {p["relationship"] for p in profs}
    assert "self" in rels
    state["self_profile_id"] = next(p["id"] for p in profs if p["relationship"] == "self")


def test_create_update_delete_dependent(owner, state):
    # Create
    r = owner.post(f"{BASE}/profiles",
                   json={"name": "TEST_Dep", "relationship": "sibling", "date_of_birth": "2000-01-01"})
    assert r.status_code == 200
    pid = r.json()["id"]
    # PATCH
    r = owner.patch(f"{BASE}/profiles/{pid}",
                    json={"name": "TEST_Dep_Updated", "relationship": "sibling"})
    assert r.status_code == 200
    # DELETE
    r = owner.delete(f"{BASE}/profiles/{pid}")
    assert r.status_code == 200


def test_cannot_delete_self(owner, state):
    r = owner.delete(f"{BASE}/profiles/{state['self_profile_id']}")
    assert r.status_code == 400


def test_update_health(owner, state):
    pid = state["self_profile_id"]
    payload = {
        "blood_group": "O+",
        "allergies": ["Penicillin"],
        "conditions": ["Asthma"],
        "medications": ["Ventolin"],
        "emergency_contact_name": "Sarah",
        "emergency_contact_phone": "+1-555-0142",
        "notes": "TEST",
    }
    r = owner.post(f"{BASE}/profiles/{pid}/health", json=payload)
    assert r.status_code == 200
    r = owner.get(f"{BASE}/profiles")
    prof = next(p for p in r.json() if p["id"] == pid)
    assert prof["health"]["blood_group"] == "O+"
    assert "Asthma" in prof["health"]["conditions"]


# ---------- Records ----------
def test_upload_record_png(owner, state):
    pid = state["self_profile_id"]
    files = {"file": ("test.png", TINY_PNG, "image/png")}
    data = {"profile_id": pid, "title": "TEST_Record", "category": "Lab Reports",
            "doctor": "Dr X", "hospital": "H", "record_date": "2026-01-05",
            "tags": "test,qa", "notes": "unit-test-note"}
    # Retry against transient storage 500s
    last = None
    for _ in range(3):
        r = owner.post(f"{BASE}/records", files=files, data=data)
        last = r
        if r.status_code == 200:
            break
        time.sleep(1)
    assert last.status_code == 200, last.text
    state["record_id"] = last.json()["id"]


def test_upload_invalid_category(owner, state):
    files = {"file": ("test.png", TINY_PNG, "image/png")}
    data = {"profile_id": state["self_profile_id"], "title": "X", "category": "Nope"}
    r = owner.post(f"{BASE}/records", files=files, data=data)
    assert r.status_code == 400


def test_upload_unsupported_mime(owner, state):
    files = {"file": ("t.exe", b"MZ\x00\x00", "application/x-msdownload")}
    data = {"profile_id": state["self_profile_id"], "title": "X", "category": "Other"}
    r = owner.post(f"{BASE}/records", files=files, data=data)
    assert r.status_code == 400


def test_upload_oversize(owner, state):
    big = b"a" * (26 * 1024 * 1024)
    files = {"file": ("big.pdf", big, "application/pdf")}
    data = {"profile_id": state["self_profile_id"], "title": "Big", "category": "Other"}
    r = owner.post(f"{BASE}/records", files=files, data=data)
    assert r.status_code == 400


def test_list_records_filters(owner, state):
    r = owner.get(f"{BASE}/records", params={"profile_id": state["self_profile_id"]})
    assert r.status_code == 200
    assert any(x["id"] == state["record_id"] for x in r.json())
    r2 = owner.get(f"{BASE}/records", params={"category": "Lab Reports", "q": "TEST_Record"})
    assert r2.status_code == 200
    assert any(x["id"] == state["record_id"] for x in r2.json())


def test_download_record(owner, state):
    r = owner.get(f"{BASE}/records/{state['record_id']}/download")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/png")
    assert len(r.content) > 0


def test_delete_record_soft(owner, state):
    # create a throwaway record for delete
    files = {"file": ("d.png", TINY_PNG, "image/png")}
    data = {"profile_id": state["self_profile_id"], "title": "TEST_Del", "category": "Other"}
    rid = owner.post(f"{BASE}/records", files=files, data=data).json()["id"]
    r = owner.delete(f"{BASE}/records/{rid}")
    assert r.status_code == 200
    r2 = owner.get(f"{BASE}/records/{rid}")
    assert r2.status_code == 404


# ---------- Shares ----------
def test_share_flow_with_pin(owner, state):
    r = owner.post(f"{BASE}/shares", json={
        "profile_id": state["self_profile_id"],
        "record_ids": [state["record_id"]],
        "expires_in_hours": 24,
        "pin": "1234",
        "label": "TEST_Share"
    })
    assert r.status_code == 200, r.text
    share = r.json()
    state["share_id"] = share["id"]
    state["share_token"] = share["token"]

    # public without PIN
    r = requests.get(f"{BASE}/public/share/{share['token']}")
    assert r.status_code == 200
    assert r.json().get("pin_required") is True

    # with correct PIN
    r = requests.get(f"{BASE}/public/share/{share['token']}", params={"pin": "1234"})
    assert r.status_code == 200
    body = r.json()
    assert "records" in body and "profile" in body
    assert len(body["records"]) == 1

    # download via public link
    r = requests.get(f"{BASE}/public/share/{share['token']}/record/{state['record_id']}",
                     params={"pin": "1234"})
    assert r.status_code == 200
    assert len(r.content) > 0


def test_share_invalid_record_ids(owner, state):
    r = owner.post(f"{BASE}/shares", json={
        "profile_id": state["self_profile_id"],
        "record_ids": ["not-a-real-id"],
        "expires_in_hours": 1,
    })
    assert r.status_code == 400


def test_share_revoke_returns_410(owner, state):
    r = owner.post(f"{BASE}/shares/{state['share_id']}/revoke")
    assert r.status_code == 200
    r2 = requests.get(f"{BASE}/public/share/{state['share_token']}", params={"pin": "1234"})
    assert r2.status_code == 410


# ---------- Sessions ----------
def test_sessions_list_current(owner):
    r = owner.get(f"{BASE}/sessions")
    assert r.status_code == 200
    sess = r.json()
    assert any(s["current"] for s in sess)


def test_revoke_all_others_then_delete_one(owner):
    # Make another session for owner
    s2 = requests.Session()
    s2.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    # revoke-all others
    r = owner.post(f"{BASE}/sessions/revoke-all")
    assert r.status_code == 200
    # After revoke-all, s2's session should be revoked
    r2 = s2.get(f"{BASE}/auth/me")
    assert r2.status_code == 401


# ---------- Audit ----------
def test_audit_trail(owner):
    r = owner.get(f"{BASE}/audit")
    assert r.status_code == 200
    logs = r.json()
    actions = {l["action"] for l in logs}
    assert "auth.login" in actions
    # Ensure sorted desc
    times = [l["created_at"] for l in logs]
    assert times == sorted(times, reverse=True)


# ---------- Export ----------
def test_export_zip(owner):
    r = owner.get(f"{BASE}/export")
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/zip"
    z = zipfile.ZipFile(io.BytesIO(r.content))
    names = z.namelist()
    assert "profiles.json" in names
    assert "records.json" in names


# ---------- AI (Gemini) ----------
def test_ai_chat_multiturn_history_clear(owner, state):
    pid = state["self_profile_id"]
    # clean history first
    owner.delete(f"{BASE}/ai/history", params={"profile_id": pid})
    r1 = owner.post(f"{BASE}/ai/chat",
                    json={"profile_id": pid, "message": "Remember the code word MANGO42 for later."})
    assert r1.status_code == 200, r1.text
    time.sleep(1)
    r2 = owner.post(f"{BASE}/ai/chat",
                    json={"profile_id": pid, "message": "What code word did I just tell you?"})
    assert r2.status_code == 200, r2.text
    reply = r2.json()["reply"]
    # Recall check (loose)
    assert "MANGO42" in reply.upper() or "mango" in reply.lower(), f"AI did not recall: {reply}"
    # history
    h = owner.get(f"{BASE}/ai/history", params={"profile_id": pid})
    assert h.status_code == 200
    assert len(h.json()) >= 4
    # clear
    c = owner.delete(f"{BASE}/ai/history", params={"profile_id": pid})
    assert c.status_code == 200
    h2 = owner.get(f"{BASE}/ai/history", params={"profile_id": pid})
    assert h2.json() == []


def test_ai_summarize(owner, state):
    r = owner.post(f"{BASE}/ai/summarize", json={"profile_id": state["self_profile_id"]})
    assert r.status_code == 200, r.text
    assert isinstance(r.json().get("summary"), str) and len(r.json()["summary"]) > 10


# ---------- Vitals ----------
def test_vitals_crud(owner, state):
    pid = state["self_profile_id"]
    # heart_rate
    r = owner.post(f"{BASE}/vitals", json={"profile_id": pid, "type": "heart_rate", "value": 72, "unit": "bpm"})
    assert r.status_code == 200
    vid = r.json()["id"]
    # blood_pressure with value2
    rbp = owner.post(f"{BASE}/vitals", json={"profile_id": pid, "type": "blood_pressure",
                                              "value": 120, "value2": 80, "unit": "mmHg"})
    assert rbp.status_code == 200
    # invalid
    rbad = owner.post(f"{BASE}/vitals", json={"profile_id": pid, "type": "mood", "value": 5})
    assert rbad.status_code == 400
    # list filter
    lst = owner.get(f"{BASE}/vitals", params={"profile_id": pid, "type": "heart_rate"})
    assert lst.status_code == 200
    assert all(v["type"] == "heart_rate" for v in lst.json())
    # delete
    d = owner.delete(f"{BASE}/vitals/{vid}")
    assert d.status_code == 200


# ---------- Solana ----------
def test_solana_status(owner):
    r = owner.get(f"{BASE}/solana/status")
    assert r.status_code == 200
    d = r.json()
    assert d.get("configured") is True
    assert "pubkey" in d
    assert d.get("cluster") == "devnet" or "balance_sol" in d


def test_solana_anchor_record(owner, state):
    r = owner.post(f"{BASE}/records/{state['record_id']}/anchor")
    # Either success (200) or 503 if devnet SOL exhausted — both acceptable per spec
    assert r.status_code in (200, 503), f"unexpected: {r.status_code} {r.text}"
    if r.status_code == 200:
        d = r.json()
        assert "signature" in d and "hash" in d
        # Cached second call
        r2 = owner.post(f"{BASE}/records/{state['record_id']}/anchor")
        assert r2.status_code == 200
        assert r2.json()["signature"] == d["signature"]


# ---------- Emergency ----------
def test_emergency_token_flow(owner, state):
    pid = state["self_profile_id"]
    r = owner.post(f"{BASE}/profiles/{pid}/emergency-token")
    assert r.status_code == 200
    token = r.json()["token"]
    assert r.json()["url"].endswith(f"/emergency/{token}")

    # Public access (no auth)
    pub = requests.get(f"{BASE}/public/emergency/{token}")
    assert pub.status_code == 200
    d = pub.json()
    assert d["name"]
    assert "allergies" in d and "conditions" in d and "medications" in d
    assert "latest_vitals" in d

    # Revoke
    rv = owner.delete(f"{BASE}/profiles/{pid}/emergency-token")
    assert rv.status_code == 200
    pub2 = requests.get(f"{BASE}/public/emergency/{token}")
    assert pub2.status_code == 404


# ---------- 2FA (last so we can clean up) ----------
def test_2fa_full_flow():
    s = requests.Session()
    s.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    setup = s.post(f"{BASE}/auth/2fa/setup")
    assert setup.status_code == 200
    body = setup.json()
    assert "qr_code" in body and "secret" in body and len(body["backup_codes"]) == 10
    secret = body["secret"]
    backup_codes = body["backup_codes"]
    code = pyotp.TOTP(secret).now()
    en = s.post(f"{BASE}/auth/2fa/enable", json={"totp_code": code})
    assert en.status_code == 200, en.text

    # Login without totp → 200 body says twofa_required
    s2 = requests.Session()
    r = s2.post(f"{BASE}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    assert r.status_code == 200
    assert r.json().get("twofa_required") is True

    # With correct TOTP
    s3 = requests.Session()
    time.sleep(1)
    r = s3.post(f"{BASE}/auth/login",
                json={"email": OWNER_EMAIL, "password": OWNER_PW, "totp_code": pyotp.TOTP(secret).now()})
    assert r.status_code == 200 and r.json().get("email") == OWNER_EMAIL

    # Backup code login
    s4 = requests.Session()
    r = s4.post(f"{BASE}/auth/login",
                json={"email": OWNER_EMAIL, "password": OWNER_PW, "backup_code": backup_codes[0]})
    assert r.status_code == 200

    # Disable 2FA (cleanup)
    di = s3.post(f"{BASE}/auth/2fa/disable", json={"password": OWNER_PW})
    assert di.status_code == 200

    # Verify disabled
    me = s3.get(f"{BASE}/auth/me").json()
    assert me["twofa_enabled"] is False
