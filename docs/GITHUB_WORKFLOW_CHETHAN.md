# Avighna Foods ERP — Chethan N D GitHub Development Guide

**Developer:** Chethan N D  
**Developer Role:** Developer 2  
**Business Roles:** Sales + Accounts + Logistics  
**Primary Development Areas:** CRM, Leads, Customers, Field Sales, Quotations, Sales Orders, Billing, Payments, Receivables, Dispatch and Delivery.

This document sits alongside [Harshith's GitHub workflow](GITHUB_WORKFLOW_HARSHITH.md). Shared Git rules for both developers are in [GIT_WORKFLOW.md](GIT_WORKFLOW.md). Module ownership: [DEVELOPMENT_RESPONSIBILITY_CHETHAN.md](DEVELOPMENT_RESPONSIBILITY_CHETHAN.md). Technical split and APIs: [TECHNICAL_RESPONSIBILITY_CHETHAN.md](TECHNICAL_RESPONSIBILITY_CHETHAN.md).

---

## 1. Purpose

This document defines exactly how Chethan N D should work with the Avighna Foods ERP GitHub repository.

The objective is to ensure that Chethan's work:

- Does not interfere with Harshith's work.
- Is integrated through `develop`.
- Is tested on staging before production.
- Does not bypass the Owner/Supervisor modules.
- Uses Harshith's shared Inventory, RBAC, Company and Approval services.
- Keeps production stable.

---

## 2. Branch Structure

The permanent branches are:

```
main
  ↑
develop
  ↑
feature branches
```

### `main`

Production-ready code only.

```
main
 ↓
PRODUCTION
```

**Rules:**

- Never develop directly on `main`.
- Never force-push.
- Never merge without review.
- Never bypass QA.
- Production deployment comes from `main`.

### `develop`

Integration + staging branch.

```
develop
 ↓
STAGING
```

Both Harshith's and Chethan's work eventually comes together here.

### `feature/*`

Temporary development branches. Chethan should work only on his own feature branches.

---

## 3. Chethan's Development Responsibilities

Chethan is responsible for:

```
SALES
├── Leads
├── Customers
├── Field Visits
├── Quotations
└── Sales Orders

ACCOUNTS
├── Invoices
├── Payments
├── Receivables
├── Credit Views
└── Statements

LOGISTICS
├── Vehicles
├── Drivers
├── Dispatch
├── Trips
├── LR
├── Deliveries
└── POD
```

The approved role definition assigns:

- **Sales** to Leads, Customers, Field Visits and Quotations
- **Accounts** to Invoices, Payments, Receivables and Credit Views
- **Logistics** to Vehicles, Dispatch Pipeline, Deliveries, LR, POD, Images and Remarks

---

## 4. Branch Naming Convention

All Chethan branches must follow:

```
feature/chethan/<topic>
```

### Recommended branches

**Sales**

- `feature/chethan/leads`
- `feature/chethan/customers`
- `feature/chethan/field-visits`
- `feature/chethan/quotations`
- `feature/chethan/sales-orders`

**Accounts**

- `feature/chethan/invoices`
- `feature/chethan/payments`
- `feature/chethan/receivables`
- `feature/chethan/statements`

**Logistics**

- `feature/chethan/vehicles`
- `feature/chethan/drivers`
- `feature/chethan/dispatch`
- `feature/chethan/trips`
- `feature/chethan/delivery`
- `feature/chethan/pod`

### Important

Do **not** create one giant branch:

```
feature/chethan/everything
```

Keep each branch focused on one logical change.

---

## 5. Recommended Development Order

Because these modules are interconnected, this is the recommended order:

```
LEADS
  ↓
CUSTOMERS
  ↓
FIELD VISITS
  ↓
QUOTATIONS
  ↓
SALES ORDERS
  ↓
INVOICES
  ↓
PAYMENTS
  ↓
RECEIVABLES
  ↓
DISPATCH
  ↓
DELIVERY
  ↓
POD
```

Work in parallel where dependencies allow.

---

## 6. Before Starting Any Feature

Always start from the latest `develop`.

```bash
git checkout develop
git pull origin develop
```

Then create the feature branch:

```bash
git checkout -b feature/chethan/<topic>
```

Example:

```bash
git checkout -b feature/chethan/leads
```

---

## 7. Daily Workflow

Standard workflow:

```
develop
   ↓
Create feature branch
   ↓
Development
   ↓
Local testing
   ↓
Commit
   ↓
Push
   ↓
Pull Request
   ↓
Review
   ↓
develop
   ↓
STAGING
```

---

## 8. Example — Lead Development

Start:

```bash
git checkout develop
git pull origin develop
```

Create:

```bash
git checkout -b feature/chethan/leads
```

Develop:

- Lead creation
- Lead pipeline
- Lead assignment
- Lead follow-up
- Lead activities
- Lead conversion

Then:

```bash
git status
git add .
git commit -m "Implement lead management workflow"
git push -u origin feature/chethan/leads
```

Create PR:

```
feature/chethan/leads
          ↓
       develop
```

---

## 9. Pull Request Rules

Every Chethan feature PR must target `develop`.

**Correct:**

```
feature/chethan/leads
        ↓
      develop
```

**Incorrect:**

```
feature/chethan/leads
        ↓
       main
```

---

## 10. Pull Request Description

Every PR should explain:

### What was developed?

Example: Implemented lead creation, pipeline management and follow-up tracking.

### What changed?

- Added lead creation
- Added lead stages
- Added salesperson assignment
- Added follow-up tracking
- Added lead activity timeline

### Testing

- Lead creation tested
- Lead assignment tested
- Pipeline transition tested
- Duplicate detection tested

### Dependencies

If the feature depends on Harshith:

```
Depends on:
Harshith's Company Context
```

or:

```
Depends on:
Inventory Availability API
```

---

## 11. SALES — Chethan's Primary Ownership

Chethan owns the complete Sales workflow.

```
Lead
 ↓
Qualification
 ↓
Customer
 ↓
Visit
 ↓
Quotation
 ↓
Approval if required
 ↓
Sales Order
```

---

## 12. Leads

**Recommended branch:** `feature/chethan/leads`

**Responsibilities:**

- Lead creation
- Lead classification
- Lead source
- Lead assignment
- Lead pipeline
- Follow-ups
- Activity timeline
- Lead conversion
- Lost lead tracking
- Duplicate detection

The approved CRM supports lead creation, source tracking, wholesale/retail classification, duplicate detection, assignment/reassignment, pipeline stages and follow-up tracking.

---

## 13. Lead Pipeline

Lead stages:

```
NEW
 ↓
CONTACTED
 ↓
QUALIFIED
 ↓
VISIT
 ↓
QUOTATION
 ↓
NEGOTIATION
 ↓
WON / LOST
```

Sales owns the UI and workflow.

---

## 14. Customers

**Recommended branch:** `feature/chethan/customers`

**Responsibilities:**

- Customer master
- Customer contacts
- GST information
- Billing address
- Shipping address
- Customer type
- Purchase history
- Revenue
- Customer health
- Credit visibility

The approved customer master includes legal/trade name, contact details, GSTIN, addresses, customer type, company and multiple contacts.

---

## 15. Field Visits

**Recommended branch:** `feature/chethan/field-visits`

**Responsibilities:**

- Check-in
- Visit purpose
- Visit outcome
- Next action
- Competitor notes
- Issue/complaint
- GPS location
- Timestamp
- Photos
- Voice notes

The approved field-sales scope includes geotagged photos and voice notes.

---

## 16. Quotations

**Recommended branch:** `feature/chethan/quotations`

**Responsibilities:**

- Create quotation
- Add products
- Quantity
- Unit
- Requested price
- Customer
- Quotation status
- Submit for approval

---

## 17. IMPORTANT — Floor Price Integration

Chethan does **not** own the Floor Price configuration.

Harshith owns:

- Floor Price
- Pricing Rules
- Approval Thresholds

Chethan **consumes** them.

```
Chethan
Quotation
   ↓
Requested Price
   ↓
Floor Price Check
   ↓
Harshith's Approval Service
   ↓
Allowed?
   │
   ├── YES → Continue
   │
   └── NO → Owner Approval
```

The approved system routes below-floor quotations to Owner/Super Admin.

**Do not build a second floor-price engine.**

---

## 18. Sales Orders

**Recommended branch:** `feature/chethan/sales-orders`

**Responsibilities:**

- Create sales order
- Customer
- Products
- Quantity
- Price
- Order status
- Link quotation
- Credit check integration
- Inventory check integration

Approved lifecycle:

```
DRAFT
 ↓
CONFIRMED
 ↓
DISPATCHED
 ↓
INVOICED
 ↓
CLOSED
```

---

## 19. Inventory Integration

Chethan does **not** create his own inventory calculation.

Sales Order should call Harshith's inventory service:

```
Sales Order
    ↓
Inventory Availability
    ↓
On-Hand
Reserved
Available
    ↓
Reserve Stock
```

Harshith owns:

- Inventory
- Stock ledger
- Batch
- Reservation
- Warehouse

Chethan consumes those services.

---

## 20. ACCOUNTS — Primary Ownership

**Recommended branches:**

- `feature/chethan/invoices`
- `feature/chethan/payments`
- `feature/chethan/receivables`
- `feature/chethan/statements`

---

## 21. Invoice Management

Chethan owns:

- Invoice creation
- Invoice editing before finalization
- GST calculation/integration
- Invoice finalization
- Invoice PDF
- Credit notes
- Debit notes
- Invoice status

The approved invoice module includes CGST, SGST, IGST, credit notes, debit notes and company invoice prefixes.

---

## 22. Invoice Flow

```
Sales Order
     ↓
Dispatch
     ↓
Invoice
     ↓
Final
     ↓
Payment
```

Invoice states:

```
DRAFT
 ↓
FINAL
 ↓
CANCELLED
```

with credit-note linkage where applicable.

---

## 23. Payment Management

**Responsibilities:**

- Payment entry
- Payment mode
- Payment date
- Amount
- Reference
- Partial payment
- Full payment
- Payment allocation

Approved payment modes:

- NEFT
- UPI
- Cheque
- Cash
- Adjustment

---

## 24. Payment Example

Invoice: **₹1,00,000**

Payment: **₹60,000**

System should show:

| Field | Value |
|-------|-------|
| Paid | ₹60,000 |
| Outstanding | ₹40,000 |
| Status | PARTIALLY PAID |

**Do not overwrite the original invoice amount.**

---

## 25. Receivables

Chethan owns the **Open Invoice Register**.

It should provide:

- Customer
- Invoice
- Company
- Invoice date
- Due date
- Invoice amount
- Paid amount
- Outstanding
- Days overdue
- Salesperson

---

## 26. Ageing

Approved ageing buckets:

- CURRENT
- 1–30
- 31–60
- 61–90
- 90+

Reports should support grouping by:

- Customer
- Company
- Salesperson

---

## 27. Cost-of-Delay Integration

Harshith owns the configuration. Chethan's Accounts module applies/displays it.

```
Owner
 ↓
Cost-of-Delay Policy
 ↓
Accounts
 ↓
Due Date
 ↓
Overdue
 ↓
Calculation
 ↓
Cost-of-Delay
```

The approved system supports either a ₹/day rule or percentage-after-grace-period rule.

---

## 28. Collection Follow-Ups

Accounts should support:

- Collection task
- Reminder
- Call log
- WhatsApp
- Overdue alert
- Credit-limit breach alert

---

## 29. Customer Statements

Accounts should generate:

- Customer statement
- PDF
- WhatsApp/shareable output where configured

---

## 30. LOGISTICS — Primary Ownership

**Recommended branches:**

- `feature/chethan/vehicles`
- `feature/chethan/drivers`
- `feature/chethan/dispatch`
- `feature/chethan/trips`
- `feature/chethan/delivery`
- `feature/chethan/pod`

---

## 31. Dispatch

The approved dispatch pipeline is:

```
PENDING
 ↓
ALLOCATED
 ↓
PACKED
 ↓
READY
 ↓
DISPATCHED
 ↓
DELIVERED
```

Chethan owns the Logistics UI and workflow after warehouse readiness.

---

## 32. Warehouse → Logistics Handoff

Harshith controls:

```
Inventory
 ↓
Picking
 ↓
Packing
 ↓
READY
```

Chethan takes over:

```
READY
 ↓
Vehicle
 ↓
Trip
 ↓
Dispatch
 ↓
Delivery
 ↓
POD
```

**Do not create a second warehouse workflow inside Logistics.**

---

## 33. Vehicle Management

**Responsibilities:**

- Vehicle master
- Plate number
- Vehicle type
- Capacity
- Owner
- Transporter
- Availability

Availability:

- AVAILABLE
- BOOKED
- MAINTENANCE

The approved system also requires double-booking prevention and capacity validation.

---

## 34. Driver Management

**Responsibilities:**

- Driver name
- Phone
- Vehicle/trip assignment

---

## 35. Trip Management

**Responsibilities:**

- Create trip
- Vehicle
- Driver
- Transporter
- LR
- ETA
- Route
- Stops
- Delivery status

The approved scope supports multi-stop trips and route/stop information.

---

## 36. Proof of Delivery

POD supports:

- Photo
- Signature
- Notes

```
DELIVERY
   ↓
Customer
   ↓
Delivered
   ↓
Photo
   ↓
Signature
   ↓
Remarks
   ↓
POD Complete
```

---

## 37. Delivery Exceptions

Support:

- Failed delivery
- Failure reason
- Reattempt
- Return
- Short delivery

---

## 38. Integration With Harshith

Chethan depends on the following services/contracts from Harshith:

- Product Master
- Inventory Availability
- Stock Reservation
- Floor Price
- Approval Workflow
- Company Context
- RBAC

These should be treated as **shared contracts**, not duplicated functionality.

---

## 39. What Chethan Provides to Harshith

Harshith's operational modules depend on Chethan for:

- Sales Orders
- Customer Orders
- Dispatch Readiness

Therefore the integration works both ways:

```
      HARSHITH
           ↕
       SHARED APIs
           ↕
       CHETHAN
```

---

## 40. Shared Files — Coordinate Before Editing

Chethan should coordinate with Harshith before making significant changes to:

- `backend/app/core/models.py`
- `backend/app/core/schemas.py`
- `backend/app/core/deps.py`
- `backend/app/core/seed.py`

Also coordinate on:

- Authentication
- RBAC
- Company Context
- Shared UI shell
- Database models
- Sales Order ↔ Inventory
- Sales Order ↔ Dispatch

Especially coordinate when changing:

- Sales Order schema
- Product references
- Company IDs
- Inventory reservation fields
- User/role models

---

## 41. Database Changes

Chethan's database changes must follow:

```
Feature branch
      ↓
Migration
      ↓
Local testing
      ↓
PR → develop
      ↓
Staging
      ↓
Integration testing
      ↓
Production
```

- Never manually modify production data to fix a development issue.
- Never apply an untested migration directly to production.

---

## 42. Git Update Workflow

While working, `develop` will continue changing. Update the feature branch:

```bash
git checkout develop
git pull origin develop

git checkout feature/chethan/<topic>
git merge develop
```

Example:

```bash
git checkout develop
git pull origin develop

git checkout feature/chethan/invoices
git merge develop
```

Then resolve conflicts and test.

---

## 43. Conflict Resolution

If a conflict occurs, do **not** blindly choose Accept Current or Accept Incoming.

Understand the changes first. Coordinate with Harshith if the conflict involves:

- Product model
- Inventory model
- Company context
- RBAC
- Sales Order
- Shared UI
- Database schemas
- API contracts

Never delete another developer's changes just to resolve a conflict quickly.

---

## 44. Commit Guidelines

**Good:**

```bash
git commit -m "Implement lead follow-up tracking"
git commit -m "Add partial payment allocation"
git commit -m "Implement delivery POD upload"
```

**Avoid:**

- `update`
- `changes`
- `final`
- `done`
- `latest`

Keep commits small and meaningful.

---

## 45. Security Rules

**Never commit:**

- `.env`
- `.env.local`
- `.env.staging`
- `.env.production`

**Never commit:**

- Database passwords
- JWT secrets
- API keys
- SSH keys
- AWS credentials
- WhatsApp credentials
- SMTP passwords
- Private certificates

**Also never commit:**

- Real customer data
- Real payment data
- Production database dumps
- Customer PII exports

If a secret is accidentally committed, rotate it immediately.

---

## 46. Staging Responsibility

After a feature is merged:

```
feature/chethan/...
       ↓
develop
       ↓
STAGING
```

Test the feature with Harshith's modules.

**Sales integration**

```
Sales Order
    ↓
Inventory
    ↓
Reservation
    ↓
Warehouse
```

**Accounts integration**

```
Sales Order
    ↓
Dispatch
    ↓
Invoice
    ↓
Payment
    ↓
Receivable
```

**Logistics integration**

```
Warehouse READY
    ↓
Vehicle
    ↓
Dispatch
    ↓
Delivery
    ↓
POD
```

---

## 47. Sales Testing Checklist

- Lead creation
- Lead assignment
- Lead pipeline
- Follow-up
- Customer creation
- Customer contacts
- Customer history
- Field visit
- GPS
- Photo upload
- Voice note
- Quotation
- Floor-price check
- Approval status
- Sales order
- Credit check
- Inventory availability
- Stock reservation

---

## 48. Accounts Testing Checklist

- Invoice creation
- GST
- Invoice PDF
- Credit note
- Debit note
- Payment
- Partial payment
- Payment allocation
- Outstanding
- Ageing
- Overdue
- Cost-of-delay
- Collection follow-up
- Customer statement

---

## 49. Logistics Testing Checklist

- Vehicle creation
- Vehicle availability
- Capacity check
- Driver
- Trip
- LR
- Dispatch
- Route
- Multi-stop
- Delivery
- POD
- Photo
- Signature
- Remarks
- Failed delivery
- Reattempt
- Return
- Short delivery

---

## 50. What Chethan Must NOT Do

Do **not**:

- Push directly to `main`.
- Force-push `main`.
- Force-push `develop`.
- Merge directly into `main`.
- Deploy a feature branch to production.
- Create a permanent `chethan` branch.
- Create a second inventory system.
- Create a second RBAC system.
- Create a second company-management system.
- Create a second floor-price system.
- Modify production DB manually.
- Commit secrets.
- Overwrite Harshith's code during conflict resolution.

---

## 51. What Chethan SHOULD Do

Always:

- Start from latest `develop`.
- Create a focused feature branch.
- Keep commits meaningful.
- Push feature branches.
- Create PRs into `develop`.
- Test locally.
- Test integration on staging.
- Coordinate API contracts with Harshith.
- Keep database migrations version-controlled.
- Never expose production credentials.
- Verify role/company permissions.

---

## 52. Complete Chethan Git Flow

```
                        GitHub
                            │
                            ▼
                         develop
                            │
                   git pull origin develop
                            │
                            ▼
              feature/chethan/<topic>
                            │
                            ▼
                       Development
                            │
                            ▼
                       Local Testing
                            │
                            ▼
                           Push
                            │
                            ▼
                       Pull Request
                            │
                            ▼
                         develop
                            │
                            ▼
                       STAGING VPS
                            │
                            ▼
                  Integration Testing
                            │
                            ▼
                            QA
                            │
                            ▼
                       develop → main
                            │
                            ▼
                        PRODUCTION
```

---

## 53. Quick Command Cheat Sheet

**Start work**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/chethan/<topic>
```

Example:

```bash
git checkout -b feature/chethan/leads
```

**Check changes**

```bash
git status
```

**Commit**

```bash
git add .
git commit -m "Implement lead management workflow"
```

**Push**

```bash
git push -u origin feature/chethan/leads
```

**Update branch**

```bash
git checkout develop
git pull origin develop

git checkout feature/chethan/leads
git merge develop
```

**After PR is merged**

```bash
git checkout develop
git pull origin develop
```

Then start the next feature branch.

---

## 54. Chethan's Branch Map

```
main
│
└── develop
    │
    ├── feature/chethan/leads
    │
    ├── feature/chethan/customers
    │
    ├── feature/chethan/field-visits
    │
    ├── feature/chethan/quotations
    │
    ├── feature/chethan/sales-orders
    │
    ├── feature/chethan/invoices
    │
    ├── feature/chethan/payments
    │
    ├── feature/chethan/receivables
    │
    ├── feature/chethan/vehicles
    │
    ├── feature/chethan/dispatch
    │
    ├── feature/chethan/delivery
    │
    └── feature/chethan/pod
```

These are temporary feature branches, not permanent branches.

---

## 55. Chethan ↔ Harshith Integration

### Harshith → Chethan

```
Product Master
       ↓
Inventory Availability
       ↓
Stock Reservation
       ↓
Floor Price
       ↓
Approval Workflow
       ↓
Company Context
       ↓
RBAC
```

### Chethan → Harshith

```
Sales Orders
       ↓
Customer Orders
       ↓
Dispatch Readiness
```

### Integration point

```
Harshith Features
       │
       ▼
    develop
       ▲
       │
Chethan Features
       │
       ▼
    STAGING
       │
       ▼
Integration QA
       │
       ▼
     main
       │
       ▼
  PRODUCTION
```

---

## 56. Final Rules for Chethan

**DO**

```
develop
   ↓
feature/chethan/<topic>
   ↓
PR
   ↓
develop
   ↓
staging
   ↓
QA
   ↓
main
```

**DON'T**

```
feature/chethan/<topic>
        ↓
       main
```

And never:

```
Chethan
   ↓
Production
```

without the `develop` → staging → QA → `main` process.

---

## 57. Chethan's One-Line Responsibility

Chethan N D develops and maintains the Sales, Accounts and Logistics side of Avighna Foods, while consuming Harshith's shared RBAC, company, product, inventory, pricing and approval services and integrating all commercial and delivery workflows through the shared `develop` branch.
