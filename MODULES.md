# Avighnya Foods ERP — Module Functionality List

Complete functional scope across **12 core modules**. Use this as the product checklist for build, QA, and sign-off.

---

## Module 1: CRM & Lead Management  
*(WhatsApp Capture & Wholesale/Retail Filter)*

### Lead capture
- Manual lead create (name, phone, company, city, source, notes)
- WhatsApp inbound capture (new chat / form / webhook → lead)
- Lead source tagging (WhatsApp, Call, Visit, Referral, Website, Other)
- Duplicate phone / GST detection on create

### Lead classification
- Wholesale vs Retail filter (lead type)
- Company assignment (multi-company group)
- Priority / estimated value
- Product interest tagging

### Pipeline & ownership
- Stage pipeline: New → Contacted → Qualified → Visit → Quotation → Negotiation → Won / Lost
- Assign / reassign salesperson
- Unassigned lead queue
- Bulk stage update / bulk assign
- Lost reason capture

### Follow-up & conversion
- Next follow-up date & reminders
- Activity timeline (calls, notes, visits, quotes)
- Convert lead → customer (one click)
- Link lead → quotation / opportunity

### CRM visibility
- KPI cards (total, new, qualified, converted, lost, pipeline value)
- Filters: company, salesperson, source, type (wholesale/retail), stage, date
- Stuck / overdue follow-up lists
- Lead import (CSV) & export

---

## Module 2: Customer Management  
*(Master, Credit Days, Credit Limit, Health Score)*

### Customer master
- Create / edit / deactivate customer
- Legal name, trade name, phone, email, GSTIN, billing & shipping address
- Customer type: Wholesale / Retail
- Company scoping (which firm owns the account)
- Multiple contacts (buyer, accounts, store)

### Credit control
- Credit days (payment terms)
- Credit limit (₹)
- Outstanding exposure vs limit
- Credit hold / block when over limit (configurable)
- Credit days countdown on open invoices

### Health & relationship
- Customer health score (Good / Watch / Risk) from payment behaviour + volume + complaints
- Lifetime revenue & order count
- Last order / last payment dates
- Purchase history & reorder suggestions
- Document vault (GST cert, agreement, cheque images)

### Customer ops
- Search / filter / export
- Merge duplicates
- Link to leads, visits, quotations, invoices, dispatches

---

## Module 3: Sales Management & Owner Approval Workflow  
*(Floor Price Matrix)*

### Quotation & pricing
- Create quotation from lead or customer
- Line items: product, qty, unit, asked price
- Floor price matrix (by product / customer type / qty slab / company)
- Highlight when asked price &lt; floor
- Quotation versions & validity date
- Send quotation (WhatsApp / Email / PDF)

### Owner approval workflow
- Auto-route below-floor quotes to Owner / Super Admin
- Approval queue with asked vs floor vs margin impact
- Approve / Decline with comment
- Notify salesperson of decision
- Audit trail of price exceptions

### Sales order
- Convert approved quotation → sales order
- Credit check at order time (limit + overdue)
- Inventory availability / headroom check
- Order status: Draft → Confirmed → Dispatched → Invoiced → Closed
- Salesperson targets vs achievement (optional)

### Sales visibility
- My quotes / team quotes
- Win–loss reasons
- Pipeline value by stage

---

## Module 4: Sales Field  
*(Geotagged Photos, Voice Notes)*

### Visit logging
- Check-in for existing or new prospect
- Visit purpose (prospecting, follow-up, collection, complaint, delivery support)
- Outcome notes & next action
- Competitor / market notes
- Complaint / issue flag → escalate

### Media capture
- Geotagged photo upload (lat/lng + timestamp)
- Multiple photos per visit
- Voice note upload (with geotag when available)
- Offline queue / retry (mobile-friendly)

### Field ops
- Today’s visit plan
- Follow-up reminders from visits
- Visit history on customer / lead
- Supervisor monitoring (who visited where / when)
- Map or list view of day’s field activity

---

## Module 5: Inventory & Batch Management  
*(Stock Ledger, Lot Tracking, Ageing Badges)*

### Stock master
- Product master (SKU, name, UOM, floor / base price)
- Warehouse master (default + multi-warehouse)
- Opening stock & stock adjustment (set)

### Batch / lot tracking
- Inbound with batch / lot number + manufacturer
- Lot-wise balance (not only product totals)
- Expiry / MFD date (where applicable)
- Lot traceability: which inbound → which outbound

### Stock ledger
- Movement types: inbound, outbound, transfer, adjustment, return
- Ledger per product / warehouse / lot
- On-hand vs booked (reserved for open orders) vs headroom
- Low-stock threshold & alerts

### Ageing
- Ageing badges on lots (Fresh / Aging / Old / Critical)
- Ageing report by warehouse / product
- FIFO / FEFO pick guidance for dispatch

### Ops
- Stock transfer between warehouses
- Physical count / cycle count
- Inventory export & snapshot KPIs

### Supervisor order desk (after Super Admin / Owner approval)
1. Confirmed sales order lands on Order desk (`pending_verify`)
2. Second stock availability check (Sales already checked once)
3. If short → raise purchase requirement → Owner/Super Admin approve → receive from manufacturer → stock inward + batch → order becomes ready
4. If available (or after inward) → allocate stock, prepare dispatch, book vehicle window (morning / afternoon / evening) for logistics
5. Dispatch info goes to Accounts for invoice; Supervisor continues to manage inventory

---

## Module 6: Purchase Management  
*(Fixed Manufacturers, PO Tracker, Landed Cost)*

### Manufacturer master
- Fixed manufacturer list (approved vendors)
- Contact, payment terms, lead time
- Link manufacturer → products / brands

### Purchase orders
- Create PO (manufacturer, product, qty, rate, ETA, company)
- Source tagging (sales referral / direct / manufacturer / other)
- Link PO to customer / sales demand (when fulfilment buy)
- PO statuses: Draft → Confirmed → Partial → Received → Closed / Cancelled
- PO tracker board & filters

### Receiving & cost
- GRN / inbound against PO (partial receive)
- Landed cost (freight, duty, handling → unit cost)
- Variance: ordered vs received vs billed
- Purchase returns / debit notes
- Auto-create dispatch load when stock is for a customer order (optional)

### Purchase visibility
- Open PO value, overdue ETA, manufacturer performance
- Cost vs selling floor awareness for owners

---

## Module 7: Dispatch Management  
*(6-Stage Pipeline, Vehicle & Driver Details, LR Logging)*

### 6-stage pipeline
1. **Pending** — waiting for vehicle / packing
2. **Allocated** — vehicle assigned
3. **Packed** — warehouse packed
4. **Ready** — sealed / ready to leave
5. **Dispatched** — in transit
6. **Delivered** — POD complete  

Stage board with counts; advance only with required fields.

### Vehicle & driver
- Vehicle master (plate, type, capacity kg, owner, transporter / agency)
- Driver name & phone on vehicle or per trip
- Availability calendar (available / booked / maintenance)
- Assign only if vehicle is free; unassign / reassign
- Capacity check vs load weight (override with auth)

### Trip & LR
- Load create from SO / purchase fulfilment / manual
- LR (lorry receipt) number logging
- Transporter, ETA, route / stops
- Multi-stop delivery day plan
- Delivery status per stop

### Proof of delivery
- POD photo / signature / notes
- Delivery failure reasons & reattempt
- Returns / short delivery logging

---

## Module 8: Billing & Invoicing  
*(PDF, Automated WhatsApp / Email)*

### Invoice generation
- Create invoice from sales order / dispatch
- Tax breakup (CGST / SGST / IGST as applicable)
- Credit note / debit note
- Invoice numbering per company prefix
- Draft → Final → Cancelled / Credit-noted

### Documents & delivery
- PDF invoice generation & download
- Automated WhatsApp send to customer
- Automated email send
- Resend / share link
- Print-ready template (company logo & branding)

### Invoice ops
- Invoice list filters (company, customer, status, date, overdue)
- Link invoice ↔ payment ↔ dispatch
- E-invoice / e-way bill hooks (future-ready fields)

---

## Module 9: Credit & Receivable Management  
*(Cost-of-Delay Penalties, Aging Reports)*

### Receivables
- Open invoice register with due date
- Days to due / days overdue countdown
- Partial & full payment booking
- Payment modes (NEFT, UPI, cheque, cash, adjustment)
- Receipt / payment allocation to invoices

### Cost of delay
- Configurable penalty formula (₹/day or % after grace)
- Auto-calculate cost-of-delay on overdue invoices
- Owner-editable policy per company / customer tier
- Penalty waiver with reason + audit

### Aging & collections
- Aging buckets: Current / 1–30 / 31–60 / 61–90 / 90+
- Aging report by customer / company / salesperson
- Collection follow-up tasks & reminders (WhatsApp / call log)
- Credit limit breach alerts
- Customer statement (PDF / WhatsApp)

---

## Module 10: Executive Analytics Dashboards  
*(Owner, Sales, Customer, Inventory, Financial)*

### Owner dashboard
- Group + per-company KPIs (revenue, margin, outstanding, pipeline)
- Daily / monthly / yearly grain
- Top customers, stuck leads, overdue receivables
- Approval queue snapshot
- Cross-company comparison

### Sales dashboard
- Personal / team targets vs achievement
- Lead conversion funnel
- Visit activity & coverage
- Quote win rate & price-exception count

### Customer analytics
- Health distribution
- Concentration risk (top N revenue share)
- Churn / dormant accounts
- Credit utilisation heatmap

### Inventory analytics
- Stock value, ageing mix, slow movers
- Fill rate / stockouts
- Inbound vs outbound trend

### Financial analytics
- Revenue, collections, outstanding, cost-of-delay
- Invoice aging summary
- Purchase vs sales margin view
- Export to Excel / PDF

### Shared
- Role-aware widgets (see only permitted data)
- Date range & company filters
- Drill-down from KPI → transaction list

---

## Module 11: Multi-Company Group Management

### Organisation structure
- Organisation (group) with multiple companies / firms
- Seeded / managed company profiles (legal name, trade name, GST, address)
- Company branding (logo, invoice prefix, colours)

### Access & data
- User ↔ company membership (one or many firms)
- Active company switcher in UI
- Strict company-scoped data isolation
- Shared masters where allowed (e.g. org-level vehicles) vs company-scoped (customers, stock)

### Group reporting
- Consolidated group view for Owner / Super Admin
- Per-firm vs all-firms toggle on dashboards
- Cross-company audit visibility for Super Admin

### Admin
- Add / edit / deactivate company
- Default warehouse per company
- Company-level credit & approval policies

---

## Module 12: User & Role-Based Permission System  
*(5 Defined Roles)*

### Defined roles (operating set)
1. **Owner / Super Admin** — full group visibility, approvals, config  
2. **Supervisor** — order desk (verify / procure / allocate / vehicle slot), warehouse, inventory, field monitoring  
3. **Sales** — leads, customers, field visits, quotations (own / team scope)  
4. **Accounts** — invoices, payments, receivables, credit views  
5. **Logistics** — vehicles, dispatch pipeline, deliveries, LR / POD  

*(Technical note: Super Admin may sit above Owner for platform setup; Warehouse folded into Supervisor where applicable.)*

### Auth & identity
- Email / password login
- Session / JWT auth
- Logout & password change
- Forgot / reset password
- Force password reset by admin

### Permission model
- Permission catalog (view / create / edit / delete / approve / export by module)
- Role → default permission set
- Optional per-user grants / restrictions
- Owner / Super Admin bypass for ops continuity
- Nav & API both enforce the same permissions

### User admin
- Create / deactivate users
- Assign role + company access
- Audit log of sensitive actions (approve, stock set, payment, role change)
- Login / access review for Owner

### Configurable policy (admin)
- Lead stages & lost reasons
- Floor price matrix rules
- Credit days / limit defaults
- Cost-of-delay formula
- Notification templates (WhatsApp / Email)
- Approval thresholds

---

## Cross-cutting (all modules)

- Mobile-responsive UI
- Audit trail on create / update / approve / delete
- Notifications (in-app + WhatsApp / Email where configured)
- Search, filter, pagination, export
- Soft validation at trust boundaries (credit, stock, vehicle availability, floor price)
- Company context on every transactional screen

---

## Suggested delivery waves

| Wave | Modules | Focus |
|------|---------|--------|
| **1** | 1, 2, 11, 12 | CRM, customers, multi-company, RBAC |
| **2** | 3, 4, 5 | Sales approvals, field, inventory/lots |
| **3** | 6, 7 | Purchases + dispatch pipeline |
| **4** | 8, 9 | Billing + receivables / cost-of-delay |
| **5** | 10 | Executive analytics & exports |

---

*Document version: 1.0 — Avighnya Foods B2B ERP functionality catalogue*
