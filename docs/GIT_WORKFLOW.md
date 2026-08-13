# Avighna Foods ERP — Git Branching Workflow

Two-developer team workflow. **`develop` is the only integration point.** Do not ship isolated developer branches to production.

## Permanent branch structure

```
main
  ↑
develop
  ↑
feature branches
```

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Always stable. Production deploys from here. |
| `develop` | Integration + staging. Feature PRs land here. Staging deploys from here. |

**Permanent environment branches are only `main` and `develop`.**  
Do **not** create permanent per-developer branches (no `harshith`, no `chethan`).

---

## Deployment flow

```
feature/*
    ↓
Pull Request
    ↓
develop
    ↓
STAGING
    ↓
QA
    ↓
main
    ↓
PRODUCTION
```

Detailed path:

```
Feature branch
    ↓
Pull Request  →  develop
    ↓
Staging
    ↓
Integration Testing
    ↓
QA / Approval
    ↓
Pull Request  →  main
    ↓
Production
```

---

## Branch naming convention

```
feature/<developer>/<short-topic>
```

| Developer | Prefix |
|-----------|--------|
| Harshith | `feature/harshith/...` |
| Chethan N D | `feature/chethan/...` |

**Preferred (smaller, focused) examples**

Harshith:

- `feature/harshith/rbac`
- `feature/harshith/company-management`
- `feature/harshith/product-master`
- `feature/harshith/stock-management`
- `feature/harshith/purchase-orders`
- `feature/harshith/admin`
- `feature/harshith/supervisor`
- `feature/harshith/inventory`
- `feature/harshith/purchase`

Chethan:

- `feature/chethan/leads`
- `feature/chethan/customers`
- `feature/chethan/quotations`
- `feature/chethan/invoices`
- `feature/chethan/payments`
- `feature/chethan/dispatch`
- `feature/chethan/pod`
- `feature/chethan/sales`
- `feature/chethan/accounts`
- `feature/chethan/logistics`

Use a **small** branch for one change set. Avoid dumping unrelated work into one large branch.

---

## Developer responsibilities

### Harshith (Developer 1)

Owner / Super Admin · Supervisor · Administration · RBAC · Multi-company · Inventory · Warehouse · Purchase · Operational management

Shared contracts Chethan depends on:

- Product master
- Inventory availability
- Stock reservation
- Floor price
- Approval workflow
- Company context
- RBAC

### Chethan N D (Developer 2)

Sales · Accounts · Logistics · Leads · Customers · Field visits · Quotations · Sales orders · Invoices · Payments · Receivables · Dispatch · Delivery · POD

Shared contracts Harshith depends on:

- Sales orders
- Customer orders
- Dispatch readiness

**Because modules are interconnected, both streams must integrate on `develop` before production.**

---

## Feature branch workflow

1. Sync with latest `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Create a feature branch from `develop`:
   ```bash
   git checkout -b feature/<name>/<topic>
   ```
3. Commit small, meaningful changes on that branch only.
4. Keep the branch focused — one feature / one concern.
5. Open a **Pull Request targeting `develop`** (not `main`).
6. After merge, delete the feature branch (optional cleanup) and sync `develop` again before starting the next task.

---

## Pull Request workflow

### Feature → `develop`

- Base: `develop`
- Review for conflicts with the other developer’s modules
- Prefer small PRs
- Do not merge unrelated features in one PR

### `develop` → `main`

- Only after staging + QA / approval
- Requires review
- No direct push to `main`
- No merge to `main` without review

---

## Staging workflow

1. Merge approved feature PRs into `develop`
2. Deploy `develop` to **staging**
3. Run **integration testing** across both developers’ modules (sales ↔ inventory, dispatch ↔ supervisor, billing ↔ stock, etc.)
4. Fix issues on new feature branches from latest `develop`, PR back into `develop`
5. When staging is green and QA approves → PR `develop` → `main`

---

## Production workflow

1. Approved PR: `develop` → `main`
2. Deploy **`main`** to production
3. Tag releases on `main` when useful (`v1.x.y`)
4. If a hotfix is required:
   - Prefer fix on a short `feature/...` (or `hotfix/...`) from `main`, PR to `main`, then **back-merge into `develop`** so staging does not drift

---

## Merge rules

1. Never develop directly on `main`.
2. Never force-push `main`.
3. Do not merge into `main` without review and QA sign-off.
4. Feature branches must be created from the **latest `develop`**.
5. Feature PRs target **`develop`**.
6. Only tested and approved changes move from `develop` to `main`.
7. Keep commits small and meaningful.
8. Do not mix unrelated features in one branch.
9. No permanent per-developer branches — only `main` and `develop` as environment branches.
10. Developer work uses **feature** branches only.
11. Resolve merge conflicts carefully; never overwrite another developer’s work.
12. Before starting new work, synchronize with `develop`.

---

## Conflict resolution rules

1. Pull / rebase onto latest `develop` before opening or updating a PR.
2. Prefer understanding both sides of a conflict — ask the other developer when touching shared files (auth, models, shared UI shell, schemas).
3. Never use `git push --force` on `main` or `develop`.
4. Force-push to your **own** feature branch only if the team agrees (prefer `--force-with-lease`).
5. Do not discard another developer’s commits to “make the merge easy.”

Shared hotspots (coordinate early):

- `backend/app/core/models.py`, `schemas.py`, `deps.py`, `seed.py`
- Auth / RBAC / company header behaviour
- `frontend/src/components/erp/AppShell.tsx` and shared dashboards
- Sales order ↔ inventory / purchase / dispatch contracts

---

## Commit guidelines

- One logical change per commit when practical
- Message focuses on **why**, not a file list
- Prefer present-tense, short summaries (match existing repo style)
- Do not bundle formatting-only noise with feature work
- Do not commit secrets (see below)

Examples:

```
Add purchase receive flow after owner approval.

Wire invoice creation from near-dispatch loads.
```

---

## Security rules

**Never commit:**

- `.env` / `.env.local` and variants
- Passwords, API keys, database credentials
- SSH keys, JWT secrets, cloud tokens
- Private certificates or customer PII dumps

**Do:**

- Keep environment-specific config outside source (or in ignored local files)
- Use placeholders in docs/examples only
- Rotate any secret that was ever committed by mistake

---

## What developers should do

- Branch from latest `develop`
- Use `feature/<name>/<topic>` names
- Open PRs into `develop`
- Sync often with `develop`
- Coordinate on shared contracts early
- Test your module **and** the dependent path on staging when possible
- Keep PRs reviewable

## What developers should not do

- Push or commit directly to `main`
- Force-push `main` (or `develop`)
- Merge to `main` without review / QA
- Create permanent personal branches instead of feature branches
- Mix unrelated features in one branch
- Deploy a solo feature branch to production
- Commit secrets or environment credentials
- Overwrite the other developer’s work during conflict resolution

---

## Quick command cheat sheet

```bash
# Start work
git checkout develop
git pull origin develop
git checkout -b feature/<name>/<topic>

# Update your branch with latest develop
git checkout develop
git pull origin develop
git checkout feature/<name>/<topic>
git merge develop   # or: git rebase develop (team preference)

# After PR merged to develop
git checkout develop
git pull origin develop
```

Push feature branches and open PRs on GitHub.  
**Do not push to `main`.** Promote `develop` → `main` only via reviewed PR after staging QA.
