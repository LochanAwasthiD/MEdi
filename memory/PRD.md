# MediPassport — Personal Health Record Wallet

## Original Problem Statement
A web PWA where individuals store, organize, and securely share their medical records (prescriptions, lab reports, vaccinations, allergies, conditions) from one account. Family caretakers can manage records for dependents. Doctors view via time-limited share links (no account needed).

## User Personas
- **Individuals** managing personal medical records
- **Family caretakers** for kids/parents (multi-profile)
- **Doctors / first responders** consuming shared views

## Architecture (built)
Frontend: React 19 + Tailwind + shadcn/ui + Sonner + Recharts (PWA-ready)
Backend: FastAPI + MongoDB (Motor) + PyJWT + bcrypt + pyotp + qrcode
Storage: Emergent Object Storage (encrypted)
AI: Gemini 3 Flash via emergentintegrations + Backboard multi-turn memory in MongoDB
Voice: Browser SpeechSynthesis (ElevenLabs deferred pending API key)
Time-series: MongoDB vitals collection (Tiger Data replacement)
Blockchain: Solana devnet Memo program via solana-py + solders
Emergency: Public token-based emergency card w/ QR (NFC-compatible URL)

## Implemented (2026-02-12)
### Phase 1 — Auth ✓
- Email/password signup + login with brute-force lockout
- TOTP 2FA with QR + 10 backup codes
- Password reset (in-app token)
- httpOnly cookies (access 2h / refresh 30d) + session revoke
- Device/session management (list, revoke, revoke all others)
- Full audit trail

### Phase 2 — Profiles ✓
- Multiple profiles under one account (self + dependents)
- Owner seeded with 3 demo profiles (self, daughter, parent) and full health data
- Structured health profile: blood group, allergies, conditions, medications, emergency contact

### Phase 3 — Records ✓
- Upload PDF/JPG/PNG up to 25MB to Emergent Object Storage
- 6 categories, tags, doctor, hospital, date, notes
- Search + filter (category, text)
- Download and soft-delete

### Phase 4 — Share Links ✓
- Time-limited (1h / 24h / 7d / 30d), optional 4-digit PIN, revocable
- Public read-only view w/ profile snapshot + record downloads
- Every access logged in audit trail

### Phase 5 — Advanced (from architecture image) ✓
- **AI Assistant (Gemini + Backboard)**: chat with persistent memory grounded in records
- **Vitals timeline**: 6 vital types with recharts trends
- **Solana verification**: SHA-256 record anchor to devnet Memo program
- **Emergency Pass**: QR-based card for NFC/print/Wallet, public no-auth view
- **Voice narration**: browser TTS on AI replies

### Export
- Full ZIP export (profiles.json + records.json + record files)

## Backlog / P1
- ElevenLabs voice (needs API key)
- Presage sensing SDK (commercial)
- Apple/Google Wallet .pkpass (needs Apple certificate)
- Real Resend email verification (skipped for MVP)
- Family invites / cross-account sharing

## P2
- iOS/Android native shell
- ABDM / Apple Health integrations
- Offline-first PWA with camera capture
