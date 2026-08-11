# Avighnya Foods — Initial Stage

B2B distribution ERP: Lead → Customer → Quotation → Sales Order → Invoice → Payment.

## Stack

- **Frontend:** Next.js + TypeScript + Tailwind (`frontend/`)
- **Backend:** FastAPI + SQLAlchemy (`backend/`)
- **Database:** PostgreSQL via Docker Compose

WhatsApp and AI are deferred (last phase).

## Quick start

```bash
# 1. Start Postgres + API
docker compose up -d --build

# 2. Frontend
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000  
- API docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

### Seed logins

| Email | Password | Role |
|-------|----------|------|
| admin@avighnya.local | admin123 | Super Admin |
| owner@avighnya.local | owner123 | Owner |
| sales@avighnya.local | sales123 | Sales |

## Smoke test (core cycle)

With API running on port 8000:

```bash
cd backend
pip install -r requirements.txt
# if API is in Docker, only need httpx locally:
python -m scripts.smoke
```

## API company scope

Send `Authorization: Bearer <token>` and `X-Company-Id: <id>` on business endpoints.
