# Avighna Foods ERP — Technical Development Responsibility & Role Specification

**Project:** Avighna Foods B2B ERP Platform  
**Developer:** Chethan N D (Developer 2)  
**Assigned roles:** Sales · Accounts · Logistics  
**Do not implement:** Owner / Super Admin · Supervisor · Inventory · Warehouse · Purchase · RBAC · Multi-company admin

Related Chethan docs:

- [GitHub workflow](GITHUB_WORKFLOW_CHETHAN.md)
- [Development responsibility report](DEVELOPMENT_RESPONSIBILITY_CHETHAN.md)

> **Name-alignment note.** In the source draft, sections 73, 75, 78, 79 and 80 swapped Harshith and Chethan. This file follows the rest of the approved split: **Harshith = Owner/Supervisor + shared core**; **Chethan = Sales/Accounts/Logistics**. Git branches stay `feature/chethan/<topic>` as in the Chethan GitHub workflow.

---

## 1. Important Scope Rule

The approved Annexure A and Master Software Development Agreement are the source of truth.

The approved scope contains 12 modules, five defined roles, dashboards, workflows, permissions, multi-company functionality, and cross-cutting requirements. Features not explicitly included in the approved scope are outside the agreed scope and require a formal Change Request.

The five approved operating roles are:

- Owner / Super Admin
- Supervisor
- Sales
- Accounts
- Logistics

Warehouse is folded into Supervisor where applicable. **Chethan does not develop Warehouse.**

---

## 2. Development Responsibility Split

### Developer 1 — Harshith (do not build)

Roles: Owner / Super Admin · Supervisor

- Owner/Super Admin dashboard
- Supervisor dashboard
- Multi-company management
- User management
- Role and permission system
- Approval workflow
- Configuration and business formulas
- Inventory, warehouse, batch/lot
- Purchase operations
- Operational monitoring
- Management-level analytics

### Developer 2 — Chethan N D (assigned work)

Roles: Sales · Accounts · Logistics

- Sales dashboard, leads, customers, field visits, quotations, sales workflow
- Accounts dashboard, invoices, payments, receivables, credit visibility
- Logistics dashboard, vehicles, drivers, dispatch, LR, delivery, POD

---

## 3. Role vs Development Ownership

Development ownership and user permission are not the same.

Chethan develops the Sales module. That does not mean a Sales user can access everything in that module.

The application must apply Harshith's RBAC model:

```
Role → Default Permission → Optional User Restriction/Grant → Company Access → API Authorization
```

Approved actions: View · Create · Edit · Delete · Approve · Export  
Permissions must be enforced in both navigation and APIs. Chethan consumes this; Chethan does not re-implement it.

---

## 4. Overall ERP Architecture

The ERP is one system, not two applications.

```
AVIGHNA ERP SYSTEM ARCHITECTURE

Developer 1: Harshith          Developer 2: Chethan N D
• Owner / Super Admin          • Sales
• Supervisor                   • Accounts
                               • Logistics

Shared ERP Core (Harshith owns, Chethan consumes)
Authentication | RBAC | Multi-Company

Infrastructure
Database/API → VPS → GitHub
```

---

## 5. Approved Module Structure

| # | Module | Chethan |
|---|--------|---------|
| 1 | CRM & Lead Management | Primary |
| 2 | Customer Management | Primary |
| 3 | Sales Management & Owner Approval | Primary Sales UI; consume Harshith approval |
| 4 | Sales Field | Primary; Supervisor monitoring is Harshith |
| 5 | Inventory & Batch Management | Consume only |
| 6 | Purchase Management | Consume/view only |
| 7 | Dispatch Management | Primary after READY handoff |
| 8 | Billing & Invoicing | Primary |
| 9 | Credit & Receivable Management | Primary; consume Harshith credit policy |
| 10 | Executive Analytics Dashboards | Sales / Accounts / Logistics dashboards only |
| 11 | Multi-Company Group Management | Consume company context |
| 12 | User & Role-Based Permission System | Consume RBAC |

---

## 6. High-Level Development Ownership

| Module | Harshith | Chethan N D |
|--------|----------|-------------|
| CRM & Leads | Integration/Owner view | **Primary** |
| Customers | Management access | **Primary** |
| Sales & Approval | Approval engine | **Primary Sales UI** |
| Sales Field | Supervisor monitoring | **Primary** |
| Inventory | Primary | Integration |
| Purchase | Primary | Integration/View |
| Dispatch | Operational handoff | **Primary** |
| Billing | Configuration/integration | **Primary** |
| Receivables | Policy/configuration | **Primary** |
| Analytics | Owner/Supervisor | Sales/Accounts/Logistics |
| Multi-Company | Primary | Integration |
| RBAC | Primary | Integration |

This is a development split, not unrestricted end-user access.

---

# PART A — HARSHITH (out of Chethan scope)

Chethan must **not** implement Owner dashboard, multi-company admin, floor-price configuration, cost-of-delay policy UI, user/role/permission admin, Supervisor dashboard, inventory, batch, stock ledger, warehouse, purchase, GRN, or field-monitoring admin.

Chethan **consumes**:

- Floor price check and Owner approval status
- Inventory availability / reserved / headroom and stock reservation
- READY-for-dispatch warehouse state
- Company context and RBAC
- Credit policy and cost-of-delay formula

---

# PART B — CHETHAN N D (assigned work)

## 28. Assigned Roles

Sales · Accounts · Logistics

Chethan is responsible for the commercial execution layer.

---

## 29. Sales — Purpose

Approved Sales role:

- Leads
- Customers
- Field Visits
- Quotations
- Own/team scope
- Overdue visibility
- Call feature

---

## 30. Sales Dashboard

Show only sales-related information permitted to the user. Do not show Owner finance admin, inventory management, user management, system configuration, or logistics management unless RBAC grants it.

Approved requirements:

- Personal/team target vs achievement
- Lead conversion funnel
- Visit activity
- Visit coverage
- Quote win rate
- Price-exception count

```
MY SALES
Target ₹10L · Achievement ₹7.5L · 75%

LEADS
New 20 · Qualified 12 · Quotation 6 · Negotiation 3 · Won 2

TODAY
Follow-ups · Visits · Pending quotations

PERFORMANCE
Conversion · Quote Win Rate · Visit Coverage
```

---

## 31. Lead Creation

Fields: Name, Phone, Company, City, Source, Notes

Sources: WhatsApp, Call, Visit, Referral, Website, Other

Duplicate detection: Phone, GST

---

## 32. Lead Classification

- Wholesale / Retail
- Company, Priority, Estimated value, Product interest

---

## 33. Lead Pipeline

```
New → Contacted → Qualified → Visit → Quotation → Negotiation → Won / Lost
```

Support assign, reassign, unassigned queue, bulk stage and bulk assignment.

---

## 34. Follow-Up

- Next follow-up date and reminder
- Activity timeline
- Calls, notes, visits, quotes
- Convert lead to Customer
- Link lead to Quotation / Opportunity
- Stuck and overdue follow-up lists

---

## 35. Lead Page

KPI cards: Total, New, Qualified, Converted, Lost, Pipeline Value

Filters: Search, Company, Salesperson, Source, Type, Stage, Date

Lead list: ID, Business, Contact, Source, Stage, Value, Assigned, Next Follow-up

CSV import/export is in the approved CRM scope.

---

## 36. Customer Management

Customer master:

- Legal name, Trade name, Phone, Email, GSTIN
- Billing address, Shipping address
- Customer type, Company
- Multiple contacts

---

## 37. Customer Credit Visibility

Sales may see permitted credit information. Sales does **not** own payment recording.

- Credit days, credit limit, outstanding exposure, credit status, credit countdown
- Configurable credit hold/block when over limit (policy owned by Harshith)

---

## 38. Customer Health

GOOD / WATCH / RISK based on payment behaviour, volume, complaints.

Also: lifetime revenue, order count, last order, last payment, purchase history, reorder suggestions.

---

## 39. Field Visits

Salesperson can: check in, select existing/new prospect, purpose, outcome, next action, competitor notes, complaint/issue.

Purposes: Prospecting, Follow-up, Collection, Complaint, Delivery support

Field activity data must be available for Harshith's Supervisor monitoring. Chethan does not build the Supervisor monitor UI.

---

## 40. Geotagged Media

```
Visit
 ├── Customer / Lead
 ├── Salesperson
 ├── Date / Time
 ├── Latitude / Longitude
 ├── Purpose / Outcome / Next Action
 ├── Photos[]
 └── Voice Note
```

---

## 41. Quotations

From Lead or Customer.

Line items: Product, Quantity, Unit, Asked price

Floor price (Harshith) by: Product, Customer type, Quantity slab, Company

---

## 42. Approval Integration

Chethan creates the quotation. Harshith's Owner approval handles exceptions.

```
Chethan: create quotation
        ↓
Harshith Floor Price API
        ↓
Allowed → continue
Below floor → Owner approve/decline
        ↓
Sales notified
```

**Do not create a second approval engine.**

---

## 43. Sales Order

```
Draft → Confirmed → Dispatched → Invoiced → Closed
```

At order time consume:

- Credit check / limit / overdue (shared rule, policy from Harshith)
- Inventory availability/headroom (Harshith)
- Stock reservation (Harshith)

---

## 44. Accounts — Purpose

Invoices · Payments · Receivables · Credit views · Excel

Accounts answers: what has been invoiced, collected, outstanding, and overdue?

---

## 45. Accounts Dashboard

KPIs: Revenue, Collections, Outstanding, Cost-of-delay, Open invoices, Overdue, Credit exposure

Approved analytics also include invoice ageing, purchase vs sales margin, Excel/PDF export.

Do not add Owner configuration or inventory modification screens.

---

## 46. Invoice Generation

From Sales Order or Dispatch.

Tax: CGST, SGST, IGST  
Also: Credit Note, Debit Note, company invoice prefix (prefix config is company-owned / Harshith)

```
Draft → Final → Cancelled
```

Additional state: Credit-Noted

---

## 47. Invoice PDF

PDF generation, download, print-ready format, company logo and branding.

Automated PDF and WhatsApp Business API are project deliverables. Use shared notification/config; do not build a second template-admin system.

---

## 48. Payment

Full / partial / allocation

Modes: NEFT, UPI, Cheque, Cash, Adjustment

Preserve payment history. Do not overwrite the original invoice amount.

---

## 49. Receivables

Open Invoice Register: invoice date, due date, days to due, days overdue, amount, paid, outstanding.

Also: customer, company, salesperson.

---

## 50. Ageing

Current · 1–30 · 31–60 · 61–90 · 90+

Group by Customer, Company, Salesperson.

---

## 51. Cost of Delay

```
Invoice → Due Date → Grace Period → Overdue → Penalty Formula → Cost of Delay
```

₹/day or percentage after grace period.

**Owner configures the policy. Accounts calculates/displays. Do not add a formula config page in Accounts.**

---

## 52. Collections

Collection follow-up tasks, reminders, WhatsApp, call log, credit-limit breach alerts.

Customer statement: PDF and WhatsApp.

---

## 53. Logistics — Purpose

Vehicles · Dispatch pipeline · Deliveries · LR · POD · Images · Remarks

---

## 54. Logistics Dashboard

Dispatch KPIs: Pending, Allocated, Packed, Ready, Dispatched, Delivered, POD pending

Vehicles: Available, Booked, Maintenance

Do not build warehouse picking/packing UI.

---

## 55. Six-Stage Dispatch

```
1. Pending → 2. Allocated → 3. Packed → 4. Ready → 5. Dispatched → 6. Delivered
```

| Stage | Meaning |
|-------|---------|
| Pending | Waiting for vehicle/packing |
| Allocated | Vehicle assigned |
| Packed | Warehouse packed (Harshith produces this) |
| Ready | Sealed/ready to leave (handoff from Harshith) |
| Dispatched | In transit |
| Delivered | POD complete |

Advance only when required fields are complete.

---

## 56. Vehicle Management

Plate number, type, capacity KG, owner, transporter/agency

Availability: Available, Booked, Maintenance

Rules: vehicle must be free, no double booking, unassign/reassign, capacity check, capacity override requires authorization.

---

## 57. Driver

Name, phone, vehicle/trip assignment. Driver details may live on the vehicle or per trip.

---

## 58. Trip & LR

From Sales Order, purchase fulfilment, or manual.

LR number, transporter, ETA, route, stops, multi-stop plan, delivery status per stop.

---

## 59. Proof of Delivery

Photo, signature, notes

Exceptions: failure reason, reattempt, return, short delivery

---

## 60. End-to-End Flow (Chethan vs Harshith)

```
LEAD                 Chethan
CUSTOMER             Chethan
FIELD VISIT          Chethan
QUOTATION            Chethan
FLOOR PRICE CHECK    Harshith
OWNER APPROVAL       Harshith
SALES ORDER          Chethan
CREDIT CHECK         Shared rule
STOCK CHECK          Harshith
STOCK RESERVE        Harshith
PICKING / PACKING    Harshith
READY                Handoff
DISPATCH             Chethan
VEHICLE / DRIVER     Chethan
DELIVERY / POD       Chethan
INVOICE / PAYMENT    Chethan
RECEIVABLE           Chethan
REPORTING            Role-aware
```

---

## 61. Integration Boundaries Chethan Must Respect

**Boundary 1 — Quotation → Approval**  
Chethan creates quotation. Harshith evaluates floor price.

**Boundary 2 — Sales Order → Inventory**  
Chethan works the sales order. Harshith checks available / reserved / headroom / lot and reserves stock.

**Boundary 3 — Inventory → Dispatch**  
Harshith moves the order to READY. Chethan Logistics consumes READY. Do not build a second warehouse workflow.

**Boundary 4 — Dispatch → Invoice**  
Logistics completes dispatch. Accounts invoices from Sales Order/Dispatch. Approved billing links invoice to payment and dispatch.

**Boundary 5 — Invoice → Payment**  
Accounts records payment and updates receivable. Sales gets permitted overdue visibility only.

---

## 62. Data Ownership (Chethan primary)

| Data | Primary |
|------|---------|
| Lead, Customer, Quotation, Sales Order, Visit | Chethan |
| Dispatch, Vehicle, Driver, LR, POD | Chethan |
| Invoice, Payment, Receivable | Chethan |

| Data | Do not own |
|------|------------|
| Organization, Company, User, Role, Permission | Harshith |
| Product, Inventory, Batch, Warehouse, Manufacturer, PO | Harshith |
| Approval rules, Floor price, Credit policy, Cost-of-delay policy | Harshith |
| Audit log, Notifications | Shared infrastructure |

---

## 63. Role-Based Dashboards Chethan Builds

| Role | Dashboard |
|------|-----------|
| Sales | My/team targets, leads, conversion, visits, quotations, win rate |
| Accounts | Revenue, collections, outstanding, ageing, cost-of-delay, invoices |
| Logistics | Pending dispatch, vehicles, trips, dispatched, delivered, POD |

Do **not** build Owner or Supervisor dashboards.

---

## 64–65. Permissions Chethan Must Enforce via Shared RBAC

```
USER → ROLE → COMPANY MEMBERSHIP → MODULE PERMISSION → ACTION PERMISSION → DATA SCOPE
```

Actions: VIEW · CREATE · EDIT · DELETE · APPROVE · EXPORT

| Role | Allowed | Not allowed |
|------|---------|-------------|
| Sales | Leads, customers, visits, quotations, own/team scope, permitted overdue visibility | Financial administration, inventory modification |
| Accounts | Invoices, payments, receivables, credit views, Excel | Inventory modification, lead ownership |
| Logistics | Vehicles, dispatch, delivery, LR, POD, images, remarks | Payment management |

Frontend hiding is not enough. APIs must return 403 when the role lacks permission.

---

## 66–71. Cross-Cutting (Chethan modules)

- Responsive UI: desktop, tablet, mobile browser
- Audit via shared audit system (quotation, invoice, payment, dispatch, POD)
- Notifications via shared channels (in-app, WhatsApp, email where configured)
- Search, filter, pagination, export
- Trust-boundary validation on API: credit, stock, vehicle availability, floor price — not frontend-only
- Every transactional screen uses active company context; strict company isolation

---

## 72–73. Shared API Principles

Do not manipulate Harshith's tables directly. Call his services.

Example Chethan consumes:

```
GET /inventory/availability

{
  "product_id": "...",
  "available": 500,
  "reserved": 200,
  "headroom": 300
}
```

### Chethan-owned APIs (implement)

```
/leads
/customers
/visits
/quotations
/sales-orders
/invoices
/payments
/receivables
/vehicles
/drivers
/dispatch
/deliveries
/pod
```

### Harshith-owned APIs (consume only)

```
/auth
/users
/roles
/permissions
/companies
/configuration
/pricing
/approval
/products
/inventory
/batches
/warehouses
/purchases
```

Endpoint names are recommendations, not contractual names.

---

## 74. Authentication

One shared implementation (Harshith). Chethan uses it. Do not build a second auth system.

---

## 75. GitHub Structure (Chethan)

Permanent: `main` ← `develop` ← `feature/chethan/<topic>`

Chethan branches only, for example:

- `feature/chethan/leads`
- `feature/chethan/customers`
- `feature/chethan/field-visits`
- `feature/chethan/quotations`
- `feature/chethan/sales-orders`
- `feature/chethan/invoices`
- `feature/chethan/payments`
- `feature/chethan/receivables`
- `feature/chethan/vehicles`
- `feature/chethan/dispatch`
- `feature/chethan/delivery`
- `feature/chethan/pod`

Do not use `feature/chethan-owner` or `feature/chethan-supervisor`. Those roles belong to Harshith.

Do not push unfinished work to `main`. Feature branch → PR → `develop` → staging → QA → `main`.

---

## 76. VPS Deployment

Shared controlled process. Do not manually modify the production database.

---

## 77. Development Rules

1. Do not duplicate shared logic.
2. Do not modify Harshith's modules without coordination.
3. Do not create duplicate tables for shared entities.
4. Do not implement permissions only on the frontend.
5. Do not bypass company isolation.
6. Do not create additional roles (five roles only unless Change Request).
7. Do not add undocumented business logic. Out-of-scope needs a Change Request.

---

## 78. Harshith Definition of Done (not Chethan)

Owner dashboard, companies, users, RBAC, floor price, credit policy, cost-of-delay config, Supervisor inventory/warehouse/purchase/field monitoring.

Chethan depends on those APIs. Chethan does not implement them.

---

## 79. Chethan Definition of Done

### Sales

- Sales dashboard
- Leads, pipeline, assignment, follow-ups
- Customer management and health
- Field visits, geotagged photos, voice notes
- Quotations and sales orders
- Approval integration (consume Harshith)

### Accounts

- Accounts dashboard
- Invoice generation, GST breakup, credit/debit notes, PDF
- Payment booking and allocation
- Receivables, ageing, cost-of-delay display
- Collection follow-ups and customer statements

### Logistics

- Logistics dashboard
- Vehicle master, driver, availability
- Dispatch board and six-stage pipeline
- LR, trip, route/stops
- POD and delivery exceptions (return / short delivery)

---

## 80. Handoff

**Harshith provides to Chethan:** authentication, RBAC, company context, product master, inventory availability, batch information, credit/approval rules, READY-for-dispatch state.

**Chethan provides to Harshith:** lead, customer, quotation, sales order, customer demand, dispatch requirement, invoice, payment.

---

## 81–82. System Flow and Role Concept

```
OWNER configures / approves
        ↓
SALES: lead → customer → visit → quotation
        ↓
FLOOR PRICE / OWNER APPROVAL (Harshith)
        ↓
SALES ORDER → credit check → inventory check → reserve
        ↓
PICK / PACK / READY (Harshith)
        ↓
DISPATCH → VEHICLE → DRIVER → DELIVERY → POD (Chethan)
        ↓
INVOICE → PAYMENT → RECEIVABLE (Chethan)
```

| Role | Concept |
|------|---------|
| Owner | Control the business (Harshith) |
| Supervisor | Control stock and operations (Harshith) |
| Sales | Generate and manage business (**Chethan**) |
| Accounts | Control billing and collections (**Chethan**) |
| Logistics | Move and deliver goods (**Chethan**) |

---

## 83. Final Responsibility Matrix (Chethan column)

| Area | Chethan |
|------|---------|
| Owner / Supervisor | — |
| Sales | Primary |
| Accounts | Primary |
| Logistics | Primary |
| Authentication / RBAC / Multi-company | Consume |
| Leads / Customers / Quotations / Field Sales | Primary |
| Inventory / Warehouse / Batches / Purchases | Consume |
| Dispatch | Primary after READY |
| Billing / Receivables | Primary |
| Analytics | Sales / Accounts / Logistics only |
| Audit / Notifications / GitHub / VPS | Shared use |

---

## 84. Scope Control

If a requirement is not in the Annexure: Change Request → technical review → commercial quote → written approval → revised timeline.

Do not add screens, modules, reports, workflows, automations, dashboards, roles, integrations, or business logic because they seem useful.

---

## 85. Final Development Ownership

```
CHETHAN N D
Sales      Leads + Customers + Field Sales + Quotations + Sales Orders
Accounts   Invoices + Payments + Receivables + Collections
Logistics  Vehicles + Dispatch + Delivery + LR + POD
```

---

## 86. Final Technical Principle

Two development streams inside one ERP, not two systems.

```
AVIGHNA ERP
HARSHITH: Owner + Supervisor
CHETHAN:  Sales + Accounts + Logistics
SHARED CORE: RBAC | MULTI-COMPANY | AUTH   (Harshith owns, Chethan consumes)
```
