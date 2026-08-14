# Avighna Foods ERP — Developer 2 Detailed Development Responsibility Report

**Developer:** Chethan N D  
**Assigned Roles:** Sales · Accounts · Logistics  
**Primary Responsibility:** Customer acquisition, sales execution, field operations, quotations, billing, payments, receivables, vehicles, dispatch, delivery and proof of delivery.

The approved specification assigns:

- **Sales** to Leads, Customers, Field Visits and Quotations
- **Accounts** to Invoices, Payments, Receivables and Credit Views
- **Logistics** to Vehicles, Dispatch Pipeline, Deliveries, LR, POD, Images and Remarks

Git workflow: [GITHUB_WORKFLOW_CHETHAN.md](GITHUB_WORKFLOW_CHETHAN.md). Technical split and APIs: [TECHNICAL_RESPONSIBILITY_CHETHAN.md](TECHNICAL_RESPONSIBILITY_CHETHAN.md). Shared team Git rules: [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

---

## 1. Developer 2 — Overall Responsibility

Chethan owns the commercial execution and delivery side of the ERP.

His development scope is divided into:

### A. Sales

- Sales dashboard
- Leads
- Lead pipeline
- Lead assignment
- Lead follow-ups
- Customer management
- Customer purchase history
- Customer health
- Field visits
- Geotagged photos
- Voice notes
- Quotations
- Sales order workflow
- Approval integration

### B. Accounts

- Accounts dashboard
- Invoice generation
- GST
- Credit notes
- Debit notes
- Payments
- Partial payments
- Payment allocation
- Receivables
- Ageing
- Overdue monitoring
- Cost-of-delay visibility
- Collection follow-ups
- Customer statements
- Excel/PDF exports where applicable

### C. Logistics

- Logistics dashboard
- Vehicle management
- Driver management
- Transporter details
- Dispatch pipeline
- Trip management
- LR
- Route/stops
- Delivery
- POD
- Delivery images
- Delivery remarks
- Delivery failure
- Reattempt
- Return
- Short delivery

---

## 2. Developer 2 — Module Ownership

| Module | Chethan N D Responsibility |
|--------|----------------------------|
| CRM & Lead Management | Primary |
| Customer Management | Primary |
| Sales Management | Primary |
| Owner Approval | Integration with Developer 1 |
| Sales Field | Primary |
| Inventory | Consume inventory services |
| Purchase | Consume purchase/stock information |
| Dispatch | Primary |
| Billing & Invoicing | Primary |
| Credit & Receivables | Primary |
| Analytics | Sales/Accounts/Logistics dashboards |
| Multi-Company | Consume company context |
| RBAC | Consume shared RBAC |

The approved project consists of 12 modules, with the above areas forming the primary development scope for Developer 2.

---

## 3. SALES ROLE

### 3.1 Role Purpose

The Sales role is responsible for converting prospects into customers and generating business.

The approved Sales scope includes:

- Leads
- Customers
- Field Visits
- Quotations
- Own/team scope
- Overdue visibility
- Call feature

The Salesperson should primarily answer:

> Who should I contact, what opportunities am I working on, what visits do I need to complete, what quotations are pending, and what business have I generated?

---

## 4. Sales Dashboard

The Sales dashboard must be role-specific.

It should **not** display:

- Company-wide financial administration
- Full inventory management
- User management
- System configuration
- Logistics management

unless separately authorized through RBAC.

The approved Sales dashboard requires:

- Personal/team target vs achievement
- Lead conversion funnel
- Visit activity
- Visit coverage
- Quote win rate
- Price-exception count

---

## 5. Sales Dashboard Layout

Recommended structure:

```
SALES DASHBOARD

My Sales Target
₹10,00,000

Achieved
₹7,50,000

Achievement
75%

────────────────────────────────

LEAD FUNNEL

New             25
Contacted       18
Qualified       12
Visit            8
Quotation        6
Negotiation      3
Won              2

────────────────────────────────

TODAY'S ACTIVITIES

Follow-ups
Customer Visits
Pending Quotations
Overdue Follow-ups

────────────────────────────────

PERFORMANCE

Conversion Rate
Visit Coverage
Quote Win Rate
Price Exceptions
```

---

## 6. Sales — Lead Management

Chethan owns the complete Lead module.

The approved CRM supports:

**Lead creation**

- Name
- Phone
- Company
- City
- Source
- Notes

**Lead sources**

- WhatsApp
- Call
- Visit
- Referral
- Website
- Other

**Duplicate detection** using:

- Phone
- GST

---

## 7. Lead Classification

A lead can be classified as:

- Wholesale
- Retail

Additional information includes:

- Company
- Priority
- Estimated value
- Product interest

---

## 8. Lead Pipeline

The approved lead pipeline is:

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

The Sales module must support:

- Salesperson assignment
- Reassignment
- Unassigned queue
- Bulk stage changes
- Bulk assignment

---

## 9. Lead Page

The Lead page should provide:

**KPI cards**

- Total Leads
- New
- Qualified
- Converted
- Lost
- Pipeline Value

**Filters**

- Search
- Company
- Salesperson
- Source
- Lead type
- Stage
- Date

**Lead table**

- Lead ID
- Business Name
- Contact
- Phone
- Source
- Type
- Stage
- Estimated Value
- Salesperson
- Next Follow-up

The approved CRM requires KPI cards, filters, stuck/overdue follow-up lists and CSV import/export.

---

## 10. Lead Details Page

A lead details page should contain:

```
LEAD PROFILE

Business Name
Contact Person
Phone
Company
City
Lead Source
Lead Type
Priority
Estimated Value
Product Interest

────────────────────

PIPELINE STATUS

New → Contacted → Qualified
             → Visit
             → Quotation
             → Negotiation
             → Won/Lost

────────────────────

FOLLOW-UPS

Date
Activity
Notes
Next Action

────────────────────

ACTIVITY TIMELINE
```

---

## 11. Lead Follow-Up

Sales must be able to:

- Set next follow-up
- Record call
- Record notes
- Schedule visit
- Track activity
- See overdue follow-ups
- See stuck leads

The approved CRM specifically includes next follow-up date/reminder, activity timeline and stuck/overdue follow-up lists.

---

## 12. Lead Conversion

The lead can be converted into a customer.

```
LEAD
 ↓
QUALIFIED
 ↓
CUSTOMER
```

After conversion, the lead should retain its history.

The system should **not** lose:

- Lead source
- Activities
- Visits
- Notes
- Salesperson
- Previous follow-ups

---

## 13. Sales — Customer Management

Chethan owns the customer-facing Customer module.

The approved customer master includes:

- Legal name
- Trade name
- Phone
- Email
- GSTIN
- Billing address
- Shipping address
- Customer type
- Company
- Multiple contacts

---

## 14. Customer Profile

The customer page should provide:

```
CUSTOMER

Company Name
Legal Name
GSTIN
Phone
Email
Billing Address
Shipping Address
Customer Type

────────────────────

CONTACTS

Contact 1
Contact 2
Contact 3

────────────────────

PURCHASE HISTORY

Orders
Revenue
Last Order
Last Payment

────────────────────

CREDIT

Credit Limit
Credit Days
Outstanding
Credit Status
```

---

## 15. Customer Credit Visibility

Sales should have the permitted visibility of customer credit information.

Information can include:

- Credit days
- Credit limit
- Outstanding
- Credit exposure
- Credit status

The approved customer module includes credit days, credit limit, outstanding exposure and configurable credit hold/block when over limit.

However:

- Sales should **not** become the owner of payment transactions.
- Payment recording remains under Accounts.

---

## 16. Customer Health

The customer profile includes a health indicator:

- GOOD
- WATCH
- RISK

Based on:

- Payment behaviour
- Volume
- Complaints

The customer profile also provides:

- Lifetime revenue
- Order count
- Last order
- Last payment
- Purchase history
- Reorder suggestions

---

## 17. Sales — Field Visits

Chethan owns the field-sales module.

The Salesperson can:

- Check in
- Select existing customer/prospect
- Select visit purpose
- Enter outcome
- Enter next action
- Enter competitor notes
- Raise complaint/issue

Approved visit purposes include:

- Prospecting
- Follow-up
- Collection
- Complaint
- Delivery support

---

## 18. Field Visit Data

A visit should contain:

```
Visit
 ├── Customer / Lead
 ├── Salesperson
 ├── Date
 ├── Time
 ├── Purpose
 ├── Outcome
 ├── Next Action
 ├── Competitor Notes
 └── Issue / Complaint
```

---

## 19. Geotagged Visit

The approved system supports:

- Latitude
- Longitude
- Timestamp
- Geotagged photos
- Multiple photos
- Voice notes

Therefore:

```
CHECK-IN
   ↓
Capture Location
   ↓
Timestamp
   ↓
Visit
   ↓
Photos / Voice Note
   ↓
Outcome
   ↓
Next Action
```

---

## 20. Field Visit Monitoring Integration

The Salesperson creates the visit.

Supervisor can monitor:

- Who visited
- Where
- When
- Purpose
- Outcome

Therefore Developer 2 needs to ensure that the field activity data is available to Developer 1's Supervisor dashboard.

---

## 21. Sales — Quotations

Chethan owns quotation creation.

Quotation can originate from:

- Lead
- Customer

Quotation lines contain:

- Product
- Quantity
- Unit
- Asked price

---

## 22. Quotation Pricing

The system needs to evaluate the requested price against the configured floor price.

Floor price can be based on:

- Product
- Customer type
- Quantity slab
- Company

---

## 23. Quotation Approval Integration

This is a critical integration point with Developer 1 — Harshith.

Chethan should create the quotation interface and submit the quotation for price validation.

```
CHETHAN
SALES
  ↓
Create Quotation
  ↓
Floor Price Check
  ↓
┌───────────────┐
│               │
Allowed       Below Floor
│               │
Continue       Approval
                ↓
             OWNER
                ↓
        Approve / Decline
                ↓
          Sales Notified
```

Developer 2 should **not** implement a second approval engine.

The approved scope requires below-floor quotations to be automatically routed to Owner/Super Admin.

---

## 24. Sales — Sales Order

The approved Sales workflow includes:

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

At order time, the system checks:

- Credit
- Limit
- Overdue
- Inventory availability/headroom

---

## 25. Sales Order — Integration With Inventory

Chethan does **not** own inventory calculation.

Instead:

```
Sales Order
     ↓
Inventory Availability API
     ↓
Available?
     ↓
Reserve Stock
```

Developer 1 owns the inventory logic. Developer 2 consumes the result.

---

## 26. ACCOUNTS ROLE

### 26.1 Purpose

Accounts handles the financial execution side of the ERP.

The approved Accounts role covers:

- Invoices
- Payments
- Receivables
- Credit Views
- Excel

The Accounts user should answer:

> What has been invoiced, what has been collected, what is outstanding, and what is overdue?

---

## 27. Accounts Dashboard

The Accounts dashboard should focus on financial execution.

**KPI cards**

- Revenue
- Collections
- Outstanding
- Overdue
- Cost-of-delay
- Open invoices
- Partial payments

**Ageing**

- CURRENT
- 1–30 DAYS
- 31–60 DAYS
- 61–90 DAYS
- 90+ DAYS

The approved financial analytics include revenue, collections, outstanding, cost-of-delay and invoice ageing.

---

## 28. Accounts Dashboard Example

```
ACCOUNTS DASHBOARD

Revenue            ₹XX
Collections        ₹XX
Outstanding        ₹XX
Overdue            ₹XX

────────────────────────

RECEIVABLE AGEING

Current            ₹XX
1–30               ₹XX
31–60              ₹XX
61–90              ₹XX
90+                ₹XX

────────────────────────

PAYMENTS

Today's Collection
This Month
Pending Allocation

────────────────────────

ALERTS

• Overdue invoices
• Credit limit breaches
• Payment follow-ups
```

---

## 29. Accounts — Invoice Generation

Invoices can be generated from:

- Sales Order
- Dispatch

The approved invoice module includes:

- CGST
- SGST
- IGST
- Credit Note
- Debit Note
- Company invoice prefix

---

## 30. Invoice Lifecycle

```
DRAFT
 ↓
FINAL
 ↓
CANCELLED
```

Additional state: **CREDIT-NOTED**

---

## 31. Invoice Data

Invoice should contain:

- Invoice number
- Company
- Customer
- GSTIN
- Billing address
- Shipping address
- Product
- Quantity
- Unit price
- Tax
- Total
- Payment status
- Due date

The exact implementation can follow the approved invoice scope and project architecture.

---

## 32. Invoice PDF

Accounts must support:

- PDF generation
- Download
- Print-ready invoice

Company-level invoice branding should use the relevant company's configuration.

The approved scope explicitly includes PDF invoice generation.

---

## 33. Payment Management

Accounts handles:

- Payment creation
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

## 34. Payment Flow

```
INVOICE
   ↓
PAYMENT DUE
   ↓
PAYMENT RECEIVED
   ↓
PAYMENT ENTRY
   ↓
ALLOCATE PAYMENT
   ↓
UPDATE OUTSTANDING
   ↓
PAID / PARTIALLY PAID
```

---

## 35. Partial Payment

Example:

| Field | Value |
|-------|-------|
| Invoice | ₹1,00,000 |
| Payment | ₹60,000 |
| Outstanding | ₹40,000 |
| Status | PARTIALLY PAID |

The system should preserve the payment history rather than replacing the invoice amount.

---

## 36. Receivables

Accounts owns the Open Invoice Register.

It should display:

- Invoice
- Customer
- Company
- Invoice date
- Due date
- Amount
- Paid amount
- Outstanding
- Days to due
- Days overdue
- Salesperson

---

## 37. Receivables Ageing

The approved ageing buckets are:

- Current
- 1–30
- 31–60
- 61–90
- 90+

Reports can be grouped by:

- Customer
- Company
- Salesperson

---

## 38. Cost-of-Delay

The Accounts module consumes the policy configured by Owner.

```
Invoice
 ↓
Due Date
 ↓
Grace Period
 ↓
Overdue
 ↓
Cost-of-Delay Formula
 ↓
Penalty
```

The approved system supports configurable:

- ₹ per day
- Percentage after grace period

---

## 39. Important Boundary — Formula Ownership

Owner/Super Admin controls the formula. Accounts applies/views the result.

```
Developer 1 / Owner
       ↓
Configure Formula
       ↓
Developer 2 / Accounts
       ↓
Calculate / Display
```

Chethan should **not** create a separate formula configuration page inside Accounts.

---

## 40. Overdue Monitoring

Accounts should identify:

- Due today
- Due soon
- Overdue
- Severely overdue

Example:

```
CUSTOMER: ABC Foods

Outstanding       ₹4,50,000
Due Amount        ₹2,00,000
Overdue           ₹1,20,000
Days Overdue      18
```

---

## 41. Collection Follow-Up

Accounts can create collection activities.

Approved scope includes:

- Collection follow-up tasks
- Reminders
- WhatsApp
- Call log
- Credit-limit breach alerts

---

## 42. Customer Statement

Accounts can generate customer statements.

Output:

- PDF
- WhatsApp

---

## 43. LOGISTICS ROLE

### 43.1 Purpose

Logistics controls the physical movement of goods after warehouse readiness.

The approved Logistics role covers:

- Vehicles
- Dispatch pipeline
- Deliveries
- LR
- POD
- Images
- Remarks

---

## 44. Logistics Dashboard

The dashboard should focus on delivery operations.

**KPIs**

- Pending dispatch
- Allocated
- Packed
- Ready
- Dispatched
- Delivered
- POD pending
- Delayed

**Vehicle status**

- Available
- Booked
- Maintenance

---

## 45. Logistics Dashboard Example

```
LOGISTICS DASHBOARD

Pending Dispatch      12
Ready                  8
Dispatched             6
In Transit             5
Delivered             14
POD Pending            3

────────────────────────

VEHICLES

Available               5
Booked                  3
Maintenance             1

────────────────────────

DELIVERY ALERTS

• Delayed deliveries
• POD pending
• Failed delivery
• Vehicle unavailable
```

---

## 46. Dispatch Pipeline

The approved dispatch pipeline contains six stages:

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

---

## 47. Dispatch Stage Rules

| Stage | Meaning |
|-------|---------|
| Pending | Order is waiting for operational processing. |
| Allocated | Vehicle has been assigned. |
| Packed | Warehouse has packed the order. |
| Ready | Order is sealed and ready to leave. |
| Dispatched | Goods are in transit. |
| Delivered | Delivery has been completed and POD recorded. |

The approved scope requires mandatory fields before advancing stages.

---

## 48. Integration With Supervisor/Warehouse

This is an important developer boundary.

Chethan's Logistics module receives the order after the warehouse side has prepared it.

```
SUPERVISOR
   │
Stock
   ↓
Picking
   ↓
Packing
   ↓
READY
   │
   ▼
LOGISTICS
   │
Vehicle
   ↓
Dispatch
   ↓
Delivery
```

Developer 2 should **not** independently create another warehouse workflow.

---

## 49. Vehicle Management

Vehicle master includes:

- Plate number
- Type
- Capacity KG
- Owner
- Transporter/agency

Availability:

- Available
- Booked
- Maintenance

---

## 50. Vehicle Rules

The system must:

- Prevent double booking
- Check vehicle availability
- Check capacity
- Allow reassignment/unassignment
- Require authorization for capacity override

---

## 51. Driver Management

Driver details include:

- Name
- Phone
- Vehicle/trip assignment

Driver information may be stored on the vehicle or per trip according to the approved design.

---

## 52. Trip Management

Trip can be created from:

- Sales Order
- Purchase fulfilment
- Manual load

Trip contains:

- LR number
- Transporter
- ETA
- Route
- Stops
- Delivery status

---

## 53. Multi-Stop Delivery

The system supports:

```
Trip
 │
 ├── Stop 1 → Customer A
 │
 ├── Stop 2 → Customer B
 │
 └── Stop 3 → Customer C
```

Each stop should have its own delivery status.

---

## 54. LR Management

Logistics should record:

- LR number
- Transporter
- Trip
- Route
- ETA

LR should be linked to the appropriate dispatch/trip.

---

## 55. Proof of Delivery

POD must support:

- Photo
- Signature
- Notes

Example:

```
DELIVERY

Customer:
ABC Foods

Status:
DELIVERED

POD:
✓ Photo
✓ Signature
✓ Remarks

Delivered At:
13-Aug-2026 16:42
```

---

## 56. Delivery Exceptions

The system supports:

- Failure reason
- Reattempt
- Return
- Short delivery

```
DISPATCHED
     ↓
DELIVERY ATTEMPT
     ↓
 ┌───┴─────────────┐
 │                 │
SUCCESS           FAILED
 │                 │
POD             Reason
 │                 │
DELIVERED       Reattempt
                  │
                Return
```

---

## 57. Logistics — Delivery Images

Images should be associated with:

- Trip
- Stop
- Delivery
- POD

Images must not become detached from the relevant transaction.

---

## 58. Logistics — Remarks

Delivery remarks can record:

- Delivery notes
- Customer comments
- Short delivery reason
- Failure reason
- Operational observations

---

## 59. Logistics → Accounts Integration

Once dispatch is completed, Accounts can use the relevant Sales Order/Dispatch relationship for invoice generation.

```
Sales Order
     ↓
Dispatch
     ↓
Delivery
     ↓
Invoice
```

The approved billing module supports invoice linkage to Sales Order and Dispatch.

---

## 60. Sales → Accounts Integration

Sales generates the commercial transaction. Accounts handles the financial transaction.

```
Quotation
    ↓
Approved
    ↓
Sales Order
    ↓
Dispatch
    ↓
Invoice
    ↓
Payment
```

- Sales should **not** directly modify payment records.
- Accounts should **not** modify Sales pipeline stages.

---

## 61. Sales → Logistics Integration

Sales creates/works with the Sales Order. Warehouse prepares the order. Logistics receives the Ready state.

```
SALES ORDER
     ↓
INVENTORY
     ↓
RESERVATION
     ↓
PICK
     ↓
PACK
     ↓
READY
     ↓
LOGISTICS
```

---

## 62. Developer 2 — Shared API Dependencies

Chethan's modules depend on services owned by Developer 1.

**Required shared services**

- Authentication
- RBAC
- Company Context
- Product Master
- Floor Price
- Approval Status
- Inventory Availability
- Stock Reservation
- Batch Information
- Credit Policy
- Notification
- Audit

Developer 2 should consume these through defined APIs/services rather than duplicating their underlying business logic.

---

## 63. Developer 2 — API Responsibility

Recommended logical API ownership:

```
/leads
/customers
/visits
/quotations
/sales-orders

/invoices
/payments
/receivables
/statements

/vehicles
/drivers
/dispatch
/trips
/deliveries
/pod
```

These endpoint names are implementation recommendations; the approved documents define the functionality, not specific API naming.

---

## 64. Developer 2 — Database Responsibility

Logical entities primarily owned by Developer 2:

**Sales**

- Lead
- Customer
- Customer Contact
- Opportunity / Quotation
- Sales Order
- Visit
- Visit Media

**Accounts**

- Invoice
- Invoice Line
- Payment
- Payment Allocation
- Receivable
- Collection Activity
- Credit/Debit Note

**Logistics**

- Vehicle
- Driver
- Trip
- Dispatch
- Delivery Stop
- POD
- Delivery Media

The exact physical schema remains an implementation decision.

---

## 65. Role-Based Access

The Sales, Accounts and Logistics interfaces must not expose unrelated modules.

**Sales should primarily see**

- Dashboard
- Leads
- Customers
- Visits
- Quotations
- Sales Orders
- Permitted Overdue Visibility

**Accounts should primarily see**

- Dashboard
- Invoices
- Payments
- Receivables
- Credit Views
- Statements
- Exports

**Logistics should primarily see**

- Dashboard
- Vehicles
- Drivers
- Dispatch
- Trips
- LR
- Deliveries
- POD

Actual access must be enforced through the common permission system.

---

## 66. API Permission Security

Frontend hiding is not sufficient.

```
Sales User
   ↓
POST /payments
   ↓
API checks role
   ↓
Permission = NO
   ↓
403 Forbidden
```

The approved specification requires permissions at both navigation and API level.

---

## 67. Company Context

Developer 2 must always operate within the active company context.

Example: Company **Asian Apex & Co**

Customer, Quotation, Sales Order, Invoice and Dispatch should all belong to the selected/authorized company.

The approved scope requires company context on transactional screens and strict company-scoped isolation.

---

## 68. Developer 2 — Audit Requirements

Chethan's modules must create audit events for important actions.

**Sales**

- Quotation creation
- Price submission
- Quote changes
- Sales order changes

**Accounts**

- Invoice creation
- Invoice cancellation
- Payment creation
- Payment allocation
- Credit/debit note

**Logistics**

- Vehicle assignment
- Dispatch
- LR creation
- Delivery completion
- POD upload
- Delivery exception

The common audit system should be shared with Developer 1.

---

## 69. Notifications

**Sales**

- New lead
- Lead assignment
- Follow-up due
- Quotation approved
- Quotation declined
- Customer overdue

**Accounts**

- Invoice generated
- Payment received
- Invoice due
- Invoice overdue
- Credit limit exceeded

**Logistics**

- Order ready
- Vehicle assigned
- Dispatch created
- Delivery delayed
- POD pending
- Delivery failed

The approved system supports in-app notifications and WhatsApp/email where configured.

---

## 70. Search, Filters and Export

Developer 2's modules must support common platform behavior:

- Search
- Filters
- Pagination
- Export

**Examples**

Sales:

- Search leads
- Filter by salesperson
- Filter by stage

Accounts:

- Filter overdue invoices
- Filter company
- Filter salesperson

Logistics:

- Filter delivery status
- Filter vehicle
- Filter date

---

## 71. Developer 2 — Sales Complete Flow

```
LEAD
 ↓
QUALIFICATION
 ↓
CUSTOMER
 ↓
FIELD VISIT
 ↓
QUOTATION
 ↓
FLOOR PRICE CHECK
 ↓
OWNER APPROVAL IF REQUIRED
 ↓
APPROVED
 ↓
SALES ORDER
 ↓
CREDIT CHECK
 ↓
INVENTORY CHECK
 ↓
STOCK RESERVATION
 ↓
WAREHOUSE
 ↓
READY
```

---

## 72. Developer 2 — Accounts Complete Flow

```
SALES ORDER
      ↓
DISPATCH
      ↓
INVOICE
      ↓
CREDIT PERIOD
      ↓
DUE DATE
      ↓
PAYMENT
      ↓
PAYMENT ALLOCATION
      ↓
OUTSTANDING UPDATED
      ↓
PAID
```

If unpaid:

```
DUE DATE
   ↓
GRACE PERIOD
   ↓
OVERDUE
   ↓
COST OF DELAY
   ↓
COLLECTION FOLLOW-UP
```

---

## 73. Developer 2 — Logistics Complete Flow

```
READY
 ↓
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
IN TRANSIT
 ↓
DELIVERY ATTEMPT
 ↓
POD
 ↓
DELIVERED
```

The approved dispatch pipeline itself is six stages: Pending → Allocated → Packed → Ready → Dispatched → Delivered.

---

## 74. Complete Developer 2 End-to-End Flow

```
                    SALES
                       │
                       ▼
                     LEAD
                       │
                       ▼
                   CUSTOMER
                       │
                       ▼
                  FIELD VISIT
                       │
                       ▼
                  QUOTATION
                       │
                       ▼
              FLOOR PRICE CHECK
                       │
              ┌────────┴────────┐
              │                 │
           APPROVED         NEEDS APPROVAL
              │                 │
              │                 ▼
              │              OWNER
              │                 │
              └────────┬────────┘
                       ▼
                  SALES ORDER
                       │
                       ▼
                CREDIT / STOCK
                    CHECK
                       │
                       ▼
                STOCK RESERVED
                       │
                       ▼
                    READY
                       │
                       ▼
                   LOGISTICS
                       │
                       ▼
                    VEHICLE
                       │
                       ▼
                    DISPATCH
                       │
                       ▼
                   DELIVERY
                       │
                       ▼
                      POD
                       │
                       ▼
                    INVOICE
                       │
                       ▼
                    PAYMENT
                       │
                       ▼
                 RECEIVABLE
```

---

## 75. Developer 2 — Integration With Developer 1

Chethan N D receives from Developer 1:

1. **Product information** — used in Quotations, Sales Orders, Invoices
2. **Floor price** — used to determine whether quotation requires approval
3. **Approval status** — Sales displays Pending / Approved / Declined
4. **Inventory availability** — Available quantity, Reserved quantity, Headroom
5. **Stock reservation** — Sales Order triggers reservation through Developer 1's inventory logic
6. **Company context** — all transactions are linked to the correct company
7. **Credit policies** — Sales/Accounts consume the configured credit rules

---

## 76. What Developer 2 Should NOT Build

To avoid duplicate logic, Chethan should not independently build:

- Product master
- Warehouse stock ledger
- Batch inventory engine
- Floor-price configuration
- Owner approval engine
- Company administration
- User administration
- Role creation
- Permission engine
- Cost-of-delay policy configuration

Those belong to Developer 1's responsibility. Developer 2 only consumes the required services.

---

## 77. What Developer 2 SHOULD Build

**Sales**

- Lead UI
- Lead APIs
- Customer UI
- Customer APIs
- Visit UI
- Visit APIs
- Quotation UI
- Quotation APIs
- Sales order UI/API
- Sales dashboard

**Accounts**

- Invoice UI/API
- Payment UI/API
- Receivable UI/API
- Ageing
- Collection follow-up
- Statement
- Accounts dashboard

**Logistics**

- Vehicle UI/API
- Driver UI/API
- Dispatch UI/API
- Trip UI/API
- LR
- Delivery
- POD
- Logistics dashboard

---

## 78. Definition of Done — Sales

- Sales dashboard
- Lead creation
- Lead assignment
- Lead reassignment
- Lead pipeline
- Follow-ups
- Stuck leads
- Lead conversion
- Customer master
- Customer contacts
- Customer purchase history
- Customer health
- Credit visibility
- Field visits
- Geotagging
- Photos
- Voice notes
- Quotations
- Floor-price integration
- Approval integration
- Sales orders
- Credit/stock check integration

---

## 79. Definition of Done — Accounts

- Accounts dashboard
- Invoice generation
- Invoice lifecycle
- GST breakup
- Credit note
- Debit note
- Invoice PDF
- Payment entry
- Partial payment
- Payment allocation
- Payment history
- Receivable register
- Ageing
- Overdue calculation
- Cost-of-delay integration
- Collection follow-ups
- Customer statements
- PDF/Excel exports where applicable

---

## 80. Definition of Done — Logistics

- Logistics dashboard
- Vehicle master
- Vehicle availability
- Driver management
- Transporter
- Dispatch pipeline
- Vehicle assignment
- Capacity validation
- Trip creation
- LR
- Route
- Multi-stop delivery
- Delivery tracking
- POD
- POD images
- Signature
- Remarks
- Failed delivery
- Reattempt
- Return
- Short delivery

---

## 81. Developer 2 — Final Responsibility Matrix

| Area | Chethan N D |
|------|-------------|
| Sales Dashboard | Primary |
| Leads | Primary |
| Lead Pipeline | Primary |
| Follow-ups | Primary |
| Customers | Primary |
| Customer History | Primary |
| Customer Health | Primary |
| Field Visits | Primary |
| Geotagging | Primary |
| Photos | Primary |
| Voice Notes | Primary |
| Quotations | Primary |
| Sales Orders | Primary |
| Owner Approval | Integration |
| Product | Consume |
| Inventory | Consume |
| Stock Reservation | Consume |
| Accounts Dashboard | Primary |
| Invoices | Primary |
| GST | Primary |
| Credit/Debit Notes | Primary |
| Payments | Primary |
| Receivables | Primary |
| Ageing | Primary |
| Cost-of-Delay | Consume configured policy |
| Collection Follow-ups | Primary |
| Customer Statements | Primary |
| Logistics Dashboard | Primary |
| Vehicles | Primary |
| Drivers | Primary |
| Trips | Primary |
| LR | Primary |
| Dispatch | Primary |
| Delivery | Primary |
| POD | Primary |
| Delivery Images | Primary |
| Delivery Remarks | Primary |
| Company Context | Consume |
| RBAC | Consume |
| Authentication | Consume |
| Audit | Shared |
| Notifications | Shared |

---

## 82. Final Developer 2 Responsibility Statement

**Chethan N D — Developer 2**

Chethan is responsible for the complete Sales, Accounts and Logistics side of the Avighna Foods ERP. This includes CRM and lead management, customer management, field sales and geotagged visits, quotations, sales-order interaction, invoice generation, GST billing, credit/debit notes, payment recording, payment allocation, receivable management, ageing, collection follow-ups, customer statements, vehicle and driver management, dispatch, trips, LR, delivery tracking, POD, delivery images, delivery remarks and delivery exceptions.

The Sales role is responsible for Leads, Customers, Field Visits and Quotations; Accounts is responsible for Invoices, Payments, Receivables and Credit Views; and Logistics is responsible for Vehicles, Dispatch Pipeline, Deliveries, LR, POD, Images and Remarks.

The core principle for Developer 2 is:

**Sales generates the business → Accounts manages the money → Logistics moves the goods.**
