# Avighna Foods ERP — Git Branching Workflow

Two-developer team workflow. **`develop` is the primary integration point for normal feature development.** Do not ship isolated developer branches to production.

Hotfixes may temporarily land on `main` (then must be back-merged into `develop`). See [Hotfixes](#hotfixes).

## Permanent branch structure

```
                    main
                     ↑
               Pull Request
                     ↑
                  develop
                     ↑
              Pull Requests
                     ↑
        ┌────────────┴────────────┐
        │                         │
 Harshith features          Chethan features
        │                         │
        ├─ rbac                   ├─ leads
        ├─ company-management     ├─ customers
        ├─ product-master         ├─ quotations
        ├─ stock-management       ├─ invoices
        └─ purchase-orders        ├─ payments
                                  ├─ dispatch
                                  └─ pod
```

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Always stable. Production VPS deploys from here. |
| `develop` | Integration + staging. Feature PRs land here. Staging VPS deploys from here. |

**Permanent environment branches are only `main` and `develop`.**  
Do **not** create permanent per-developer branches (no `harshith`, no `chethan`).

---

## Branch → environment mapping

| Branch | Environment |
|--------|-------------|
| `feature/*` | Developer / local |
| `develop` | **STAGING** VPS |
| `main` | **PRODUCTION** VPS |

Everyone must know: merging to `develop` affects staging; merging to `main` affects production.

---

## Deployment flow

```
feature/*
    ↓
Push
    ↓
GitHub Actions (lint · tests · build)
    ↓
Pull Request + code review
    ↓
develop
    ↓
STAGING VPS
    ↓
Integration Testing
    ↓
QA
    ↓
Pull Request + code review
    ↓
main
    ↓
PRODUCTION VPS
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

### Official focused feature branches

Use **small, reviewable** branches. Do **not** use broad catch-all branches like `feature/harshith/inventory` or `feature/chethan/sales`.

**Harshith**

- `feature/harshith/rbac`
- `feature/harshith/company-management`
- `feature/harshith/product-master`
- `feature/harshith/stock-management`
- `feature/harshith/purchase-orders`

**Chethan**

- `feature/chethan/leads`
- `feature/chethan/customers`
- `feature/chethan/quotations`
- `feature/chethan/invoices`
- `feature/chethan/payments`
- `feature/chethan/dispatch`
- `feature/chethan/pod`

Create additional focused branches as needed (e.g. `feature/harshith/warehouse-transfer`, `feature/chethan/credit-notes`). One concern per branch.

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

**Because modules are interconnected, both streams must integrate on `develop` (staging) before production.**

---

## Feature branch workflow

1. Sync with latest `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Create a focused feature branch from `develop`:
   ```bash
   git checkout -b feature/<name>/<topic>
   ```
3. Commit small, meaningful changes on that branch only.
4. Push the branch — **GitHub Actions** should run lint, tests, and build.
5. Open a **Pull Request targeting `develop`** (not `main`).
6. After merge, delete the feature branch (optional cleanup) and sync `develop` before the next task.

### Keep your branch up to date (team standard: merge)

```bash
git checkout develop
git pull origin develop
git checkout feature/<name>/<topic>
git merge develop
```

Resolve conflicts, test locally, then push.

**Do not rebase onto `develop` as the team default.** Everyone uses `git merge develop` so history and conflict handling stay consistent.

---

## Pull Request workflow

### Feature → `develop`

- Base: `develop`
- CI (lint / tests / build) must be green
- Review for conflicts with the other developer’s modules
- Prefer small PRs
- Do not merge unrelated features in one PR

### `develop` → `main`

- Only after staging deployment + integration testing + QA / approval
- Requires review
- CI must be green
- No direct push to `main`
- No merge to `main` without review

---

## Staging workflow

1. Merge approved feature PRs into `develop`
2. Deploy `develop` to the **staging VPS**
3. Run **integration testing** across both developers’ modules (sales ↔ inventory, dispatch ↔ supervisor, billing ↔ stock, etc.)
4. Fix issues on new feature branches from latest `develop`, PR back into `develop`
5. When staging is green and QA approves → PR `develop` → `main`

---

## Production workflow

1. Approved PR: `develop` → `main`
2. Deploy **`main`** to the **production VPS**
3. Tag releases on `main` when useful (`v1.x.y`)

### Hotfixes

`main` may temporarily receive a hotfix when production is broken:

```text
main
 ↑
hotfix/*   (or short feature/* from main)
```

1. Branch from `main`: `hotfix/<short-topic>` (or `feature/<name>/<topic>`)
2. Open a PR → `main` (review + CI)
3. Deploy `main` to production
4. **Back-merge into `develop`** immediately so staging does not drift

---

## GitHub branch protection (required)

Rules in the doc are not enough — GitHub must enforce them.

### `main`

Configure branch protection / ruleset:

- Require a pull request before merging
- Require at least one review
- Require status checks to pass (CI)
- Block force pushes
- Block branch deletion

### `develop`

Configure branch protection / ruleset:

- Require a pull request before merging
- Require status checks to pass (CI)
- Block force pushes

Optional but recommended: require a review on `develop` as well.

Configure under: **GitHub → Repository → Settings → Rules → Rulesets** (or Branch protection rules).

---

## CI (GitHub Actions) before merge

Every feature push / PR should run:

1. Lint
2. Tests
3. Build

Suggested path:

```
Feature branch
    ↓
Push
    ↓
GitHub Actions
    ↓
Lint · Tests · Build
    ↓
PR + code review
    ↓
develop → STAGING VPS
    ↓
Integration testing · QA
    ↓
PR → main → PRODUCTION VPS
```

Do not merge into `develop` or `main` while CI is red. Shared modules make broken merges expensive for both developers.

---

## Database migration rules

Sales, Accounts, Inventory, and Logistics share one database. Schema mistakes hurt everyone.

**Rules**

1. Database schema changes must be reviewed and tested on **staging** before production.
2. Never manually modify the **production** database to fix a development issue.
3. Prefer migration scripts / seed-safe schema updates checked into the repo over ad-hoc SQL on live DBs.
4. Coordinate with the other developer when a migration touches shared tables (products, stock, sales orders, dispatches, invoices, users/RBAC).

```
Feature
    ↓
Migration
    ↓
Staging DB
    ↓
Test (both modules that touch the change)
    ↓
Production DB (only via approved release from main)
```

---

## Merge rules

1. Never develop directly on `main`.
2. Never force-push `main` or `develop`.
3. Do not merge into `main` without review and QA sign-off.
4. Feature branches must be created from the **latest `develop`**.
5. Feature PRs target **`develop`**.
6. Only tested and approved changes move from `develop` to `main`.
7. Keep commits small and meaningful.
8. Do not mix unrelated features in one branch.
9. No permanent per-developer branches — only `main` and `develop` as environment branches.
10. Developer work uses **focused feature** branches only.
11. Resolve merge conflicts carefully; never overwrite another developer’s work.
12. Before starting new work, synchronize with `develop`.
13. Use `git merge develop` (not rebase) to update feature branches.
14. CI must pass before merge.
15. Schema changes follow the staging → production migration path.

---

## Conflict resolution rules

1. Merge latest `develop` into your feature branch before opening or updating a PR.
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
- Use focused `feature/<name>/<topic>` names
- Open PRs into `develop`
- Sync often with `develop` via **merge**
- Wait for CI to pass
- Coordinate on shared contracts and migrations early
- Test your module **and** the dependent path on staging when possible
- Keep PRs reviewable

## What developers should not do

- Push or commit directly to `main`
- Force-push `main` or `develop`
- Merge to `main` without review / QA
- Create permanent personal branches instead of feature branches
- Use broad branches (`…/sales`, `…/inventory`, `…/admin`) for large mixed work
- Mix unrelated features in one branch
- Deploy a solo feature branch to production
- Commit secrets or environment credentials
- Overwrite the other developer’s work during conflict resolution
- Manually patch the production database
- Rebase onto `develop` as a personal default while the other developer merges

---

## Quick command cheat sheet

```bash
# Start work
git checkout develop
git pull origin develop
git checkout -b feature/<name>/<topic>

# Update your branch with latest develop (team standard)
git checkout develop
git pull origin develop
git checkout feature/<name>/<topic>
git merge develop

# After PR merged to develop
git checkout develop
git pull origin develop
```

Push feature branches and open PRs on GitHub.  
**Do not push to `main`.** Promote `develop` → `main` only via reviewed PR after staging QA.
