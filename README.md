# MEdi (MediPassport)

MEdi is a personal health record wallet that helps users store, organize, and securely share medical information with caregivers, doctors, and emergency responders.

## Project Description

The platform combines a React frontend and FastAPI backend to manage profiles, health records, secure share links, emergency access, and AI-assisted health context in one place.

## Key Features

- Account auth with sessions, 2FA, and audit logs
- Multi-profile support (self + dependents)
- Health profile management (allergies, conditions, medications, contacts)
- Medical record upload, search, and download
- Time-limited secure share links with optional PIN
- Emergency public card and QR-based access
- AI assistant support for health-related guidance
- Vitals tracking and timeline views

## Tech Stack

- **Frontend:** React 19, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, Motor (MongoDB), PyJWT, bcrypt
- **Data/Storage:** MongoDB + object storage integration
- **Other Integrations:** Gemini model support, Solana devnet hooks

## Repository Structure

- `/home/runner/work/MEdi/MEdi/frontend` — React application
- `/home/runner/work/MEdi/MEdi/backend` — FastAPI server
- `/home/runner/work/MEdi/MEdi/backend/tests` — backend tests
- `/home/runner/work/MEdi/MEdi/memory/PRD.md` — product requirement reference

## Getting Started

### 1) Backend setup

1. Go to `/home/runner/work/MEdi/MEdi/backend`
2. Create and activate a Python virtual environment
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Set required environment variables:
   - `MONGO_URL`
   - `DB_NAME`
   - `JWT_SECRET`
5. Optional variables (feature-specific):
   - `FRONTEND_URL`
   - `INTEGRATION_PROXY_URL`
   - `EMERGENT_LLM_KEY`
   - `GEMINI_MODEL`
   - `SOLANA_RPC_URL`
   - `SOLANA_SECRET_KEY`
   - `TEXTBELT_KEY`
6. Run server:
   - `uvicorn server:app --reload --host 0.0.0.0 --port 8000`

### 2) Frontend setup

1. Go to `/home/runner/work/MEdi/MEdi/frontend`
2. Install dependencies:
   - `yarn install`
3. Configure environment:
   - `REACT_APP_BACKEND_URL=http://localhost:8000`
4. Run app:
   - `yarn start`

## Running Tests

- Backend tests:
  - `cd /home/runner/work/MEdi/MEdi/backend`
  - `pytest`

## Notes

- Keep sensitive keys in `.env` files and never commit secrets.
- Configure CORS and production secrets before deployment.
