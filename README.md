# Avighna Foods — Initial Stage

B2B distribution ERP: Lead → Customer → Quotation → Sales Order → Invoice → Payment.

## Stack

- **Frontend:** Lovable UI ([ingredient-flow-suite](https://github.com/TejasviJois/ingredient-flow-suite)) — Vite + TanStack Start (`frontend/`)
- **Backend:** FastAPI + SQLAlchemy (`backend/`)
- **Database:** PostgreSQL via Docker Compose

WhatsApp and AI are deferred (last phase).

## Quick start

```bash
# 1. Start Postgres + API
docker compose up -d --build

# 2. Frontend (Lovable UI wired to API)
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000  
- API docs: http://localhost:8000/docs  

### Seed logins

| Email | Password | Role |
|-------|----------|------|
| admin@avighnya.local | admin123 | Super Admin |
| owner@avighnya.local | owner123 | Owner |
| supervisor@avighnya.local | super123 | Supervisor |
| sales@avighnya.local | sales123 | Sales |
| accounts@avighnya.local | accounts123 | Accounts |
| logistics@avighnya.local | logistics123 | Logistics |

### Companies

1. Asian Apex & Co.  
2. Avighna Speciality Ingredients Pvt Ltd  
3. Ganesh Inc.  
4. Atharva Associates

## Smoke test

```bash
docker compose exec api python -m scripts.smoke
```
