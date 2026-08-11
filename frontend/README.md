# Ingredient Flow

Food Ingredient Distribution ERP – Master Product Prompt

Project Objective

Design and build a modern, enterprise-grade ERP platform for a B2B food ingredient distribution company. The objective is to replace multiple Excel sheets, Tally, manual approvals, phone calls, and paper-based processes with a single unified web platform and mobile-friendly interface.

This prompt is intended to be comprehensive enough that:

UI generation tools (such as Lovable) can generate screens, user flows, and design systems.

Development tools (such as Cursor) can understand the complete business logic and begin implementation.

Future AI agents can use it as the master functional specification.

Do not focus on database schemas or backend architecture at this stage. The goal is to understand the business, workflows, user journeys, modules, screens, and relationships between different parts of the system.

Company Background

The company is a wholesale distributor of food-grade industrial ingredients.

They are dealers, not manufacturers.

They procure materials from approximately four fixed manufacturers and supply them to approximately 30–35 recurring B2B customers across different industries.

The customers purchase in bulk quantities measured in metric tons, and nearly every customer places recurring monthly orders.

The company usually maintains approximately 20–25 metric tons of inventory while also occasionally shipping products directly from manufacturers to customers whenever required.

The business operates almost entirely on credit.

The company purchases products from manufacturers using advance payments.

The company then supplies products to customers on credit terms ranging between:

30 Days

45 Days

60 Days

70 Days

One of their biggest operational challenges is monitoring overdue credit periods and calculating the financial impact whenever customers exceed their agreed payment terms.

Business Workflow

The complete operational cycle is as follows:

Manufacturer

↓

Company purchases stock

↓

Stock arrives at warehouse

↓

Inventory updated

↓

Customer enquiry/order received

↓

Salesperson visits customer

↓

Negotiates price

↓

Owner approves price

↓

Sales order confirmed

↓

Inventory allocated

↓

Material dispatched

↓

Invoice generated

↓

Credit period begins

↓

Customer payment received

↓

Credit days calculated

↓

Business analytics updated

↓

Cycle repeats every month.

The software should naturally guide users through this workflow.

Design Philosophy

The software should feel like a modern ERP, similar to Zoho, Odoo, SAP Business One, or Oracle NetSuite, but significantly simpler, cleaner, and optimized specifically for a wholesale food ingredient distribution company.

The interface should be:

Modern

Minimal

Mobile-friendly

Fast

Dashboard driven

Easy for non-technical users

Role-based

Professional

Avoid clutter.

Prioritize dashboards, cards, charts, timelines, activity feeds, and actionable insights.

Primary Modules

The ERP consists of the following major modules.

CRM & Lead Management

Customer Management

Sales Management

Mobile Sales Application

Inventory Management

Purchase Management

Dispatch Management

Billing & Invoicing

Credit & Receivables Management

Analytics & Reports

Administration

Notifications & Workflow Automation

MODULE 1 — CRM & Lead Management

Current Problem

The company receives enquiries from both wholesalers and retailers.

However, they only sell to wholesale customers.

Salespeople waste time talking to retailers who cannot become customers.

Solution

Implement an AI-powered WhatsApp lead qualification system.

Workflow:

Customer messages WhatsApp

↓

Bot asks qualification questions

Examples:

Are you a retailer or wholesaler?

Which industry are you from?

Monthly requirement?

Product category?

Location?

If retailer

↓

Politely decline.

If wholesaler

↓

Automatically create CRM Lead.

Lead should include:

Company Name

Contact Person

Phone

Email

Industry

State

Product Interest

Monthly Requirement

Lead Source

Qualification Status

Lead Pipeline

New

Contacted

Meeting Scheduled

Follow-up

Negotiation

Won

Lost

Every lead should have a timeline of interactions.

MODULE 2 — Customer Management

Maintain a unified customer database.

Every customer profile should contain:

Basic Information

Company Name

GST

Address

State

Industry

Contacts

Owner

Purchase Manager

Accounts

Alternate Contacts

Business Information

Products Purchased

Monthly Consumption

Preferred Manufacturer

Preferred Pricing

Payment Terms

Credit Limit

Credit Days

Performance

Revenue

Outstanding Amount

Order Frequency

Last Purchase

Customer Lifetime Value

Activity Timeline

Calls

Visits

Orders

Payments

Notes

MODULE 3 — Sales Management

Salespeople regularly visit customers.

The CRM should allow:

Customer Visits

Meeting Notes

Customer Requirements

Price Negotiations

Follow-up Scheduling

Status Updates

Each opportunity should store:

Customer

Product

Requested Quantity

Expected Price

Competitor Price (if known)

Current Negotiation Status

Expected Closing Date

Owner Approval Workflow

Current process:

Salesperson calls owner

↓

Discusses price

↓

Owner approves verbally

Replace this with:

Salesperson enters negotiated price.

↓

Owner receives notification.

↓

Owner reviews.

↓

Approve

Reject

Suggest Different Price

↓

Salesperson receives response instantly.

No phone calls required.

MODULE 4 — Mobile Sales Application

Designed specifically for field sales staff.

Functions:

Daily Visit Planner

GPS Check-in

GPS Check-out

Geotagged Photos

Customer Notes

Requirement Collection

Quotation Entry

Price Entry

Next Follow-up Date

Voice Notes

Meeting Summary

Offline Support

Daily Visit Timeline

Owner Dashboard should display:

Where salesperson visited

How long they stayed

Customer feedback

Photos uploaded

Follow-up status

MODULE 5 — Inventory Management

Inventory is measured in metric tons.

The company maintains approximately 20–25 metric tons of stock.

Products come from four manufacturers.

Every stock movement must be traceable.

Stock Inward

Capture:

Manufacturer

Product

Quantity

Batch Number

Lot Number

Warehouse

Date

Purchase Price

Transport Details

Invoice Number

Quality Notes

Stock Outward

Capture:

Customer

Invoice

Batch Number

Quantity

Dispatch Date

Vehicle

Driver

Transport Agency

Warehouse

Stock Dashboard

Current Stock

Reserved Stock

Available Stock

Incoming Stock

Outgoing Stock

Low Stock

Dead Stock

Fast Moving Stock

Slow Moving Stock

Batch Tracking

Users should know:

Which manufacturer produced a batch

Which warehouse received it

Which customer received it

When it was dispatched

Inventory should be searchable by:

Batch

Product

Manufacturer

Warehouse

Customer

Invoice

Alerts

Low Stock

Near Stock Out

Pending Dispatch

Delayed Dispatch

MODULE 6 — Purchase Management

The company purchases products only from approximately four fixed manufacturers.

Manage:

Manufacturers

Purchase Orders

Goods Receipt

Purchase History

Product Pricing

Purchase Analytics

Track:

Expected Delivery

Received Quantity

Pending Quantity

Purchase Cost

Supplier Performance

MODULE 7 — Dispatch Management

Orders move through:

Pending

Allocated

Packed

Ready

Dispatched

Delivered

Capture:

Dispatch Date

Vehicle

Transport Agency

Driver

Invoice

LR Number

Expected Delivery

Proof of Delivery

Dispatch dashboard should show:

Today's Dispatches

Pending Dispatches

Delayed Dispatches

Completed Deliveries

MODULE 8 — Billing & Invoicing

Replace manual billing.

Features:

Invoice Generation

GST

Multiple Products

Multiple Batches

Discounts

Taxes

Transport Charges

Round Off

Invoice PDF

Invoice Email

Invoice WhatsApp

Dynamic Pricing

Prices change frequently.

Salesperson enters negotiated rate.

↓

Owner approves.

↓

Invoice automatically uses approved pricing.

Customer Pricing History should be maintained.

Credit Management

Every customer has:

Credit Limit

Credit Days

Examples:

30 Days

45 Days

60 Days

70 Days

When invoice is generated,

Credit countdown begins.

System continuously tracks:

Days Remaining

Overdue Days

Outstanding Amount

One major requirement:

If payment exceeds agreed credit days,

the company already has an internal formula for financial loss.

Implement a configurable formula engine.

Example:

Allowed Credit:

60 Days

Actual Payment:

67 Days

Delay:

7 Days

↓

Automatically compute:

Penalty

Financial Impact

Loss

Interest

Whatever formula the business configures.

The software should allow changing this formula without modifying code.

MODULE 9 — Analytics

Executive Dashboard

Display:

Today's Sales

Monthly Revenue

Outstanding Amount

Receivables

Inventory Value

Pending Dispatch

Sales Growth

Revenue by Customer

Revenue by Product

Revenue by Manufacturer

Customer Analytics

Revenue

Average Order

Order Frequency

Outstanding

Payment Behaviour

Credit Utilization

Top Customers

Inactive Customers

Sales Analytics

Revenue per Salesperson

Conversion %

Meetings

Visits

Follow-ups

Target Achievement

Inventory Analytics

Stock Value

Inventory Turnover

Fast Moving Products

Dead Stock

Low Stock

Batch Aging

Financial Analytics

Revenue

Profit

Receivables

Credit Risk

Delayed Payments

Cash Flow

MODULE 10 — Administration

Role-Based Access

Owner

Sales Manager

Salesperson

Warehouse Staff

Billing Staff

Accounts

Admin

Permissions should be granular.

Example:

Warehouse staff cannot modify invoices.

Salespeople cannot edit inventory.

Accounts cannot edit stock.

Owner has complete access.

Multi-Company Support

The business operates four different firms.

Each firm specializes in a different product segment (for example, pharma, food-grade ingredients, experimental foods, etc.).

The ERP must support multiple legal entities under a single platform.

Each company should have its own:

GST details

Invoice numbering

Products

Manufacturers

Inventory

Customers (shared or separated based on configuration)

Billing

Financial reports

The owner should be able to switch between companies from a single dashboard and also view consolidated reports across all firms.

Notifications & Automation

Automatic reminders for:

Lead Follow-ups

Upcoming Visits

Pending Approvals

Low Stock

Dispatch Today

Credit Due

Payment Overdue

Invoice Generated

Purchase Orders

Dispatch Completed

Search

Global Search should instantly find:

Customers

Products

Invoices

Orders

Batches

Manufacturers

Salespeople

Payments

Leads

Dashboard Experience

Every dashboard should prioritize visual clarity.

Use:

Cards

Tables

Graphs

Charts

Activity Timeline

Heat Maps

Progress Bars

Calendar Views

Maps

KPIs

Drill-down analytics

Mobile Experience

Every screen should be responsive.

Salespeople should comfortably perform daily tasks entirely from mobile.

Owners should be able to monitor the business from a phone without needing a desktop.

Future AI Features (Design with Extensibility)

The architecture and UI should leave room for future AI capabilities such as:

Monthly demand forecasting.

Automatic purchase recommendations.

Intelligent reorder suggestions.

Credit risk prediction.

Customer buying pattern analysis.

AI-generated sales insights.

Voice-based ERP assistant.

WhatsApp order status updates.

Smart dashboards with anomaly detection.

These features do not need to be implemented initially but should be considered in the product vision.

Deliverable Expectations

Generate a complete, production-grade ERP concept including:

Information architecture.

Navigation.

User journeys.

Screen hierarchy.

Dashboard layouts.

Desktop and mobile UI concepts.

CRUD screens.

Tables and detail pages.

Forms and approval workflows.

Notifications.

Reports.

Charts.

KPI widgets.

Role-specific dashboards.

Modern UX with clean enterprise aesthetics.

The resulting product should feel like a purpose-built ERP for a wholesale food ingredient distributor, combining CRM, inventory, purchasing, dispatch, billing, receivables, analytics, and field sales into a single cohesive platform optimized for daily operations.

Additional Requirement – Multi-Company (Multi-Firm) ERP Architecture

The ERP must be designed as a single platform supporting multiple independent companies (multi-company architecture). The business currently operates four separate firms, each representing a different business vertical and maintaining its own products, inventory, billing, and compliance requirements.

Example:

Firm 1 – Food Grade Ingredients

Firm 2 – Pharmaceutical Ingredients

Firm 3 – Experimental / Specialty Food Ingredients

Firm 4 – Other Product Division

(These names are placeholders and should be configurable.)

Multi-Company Dashboard

When the owner logs in, they should first see a Company Switcher that allows them to:

View All Companies Combined

Switch to Firm 1

Switch to Firm 2

Switch to Firm 3

Switch to Firm 4

The selected company should immediately filter all dashboards, reports, inventory, customers, invoices, products, and analytics.

Company-Specific Data

Each firm should maintain its own independent data, including:

Product Catalogue

Product Categories

Manufacturers

Inventory

Warehouses

Purchase Orders

Sales Orders

Customers (configurable as shared or separate)

Pricing

GST Details

Invoice Numbering

Credit Policies

Financial Reports

Dispatch Records

For example:

Firm 1

Products: Sucrose, Glucose Syrup, Food Stabilizers

Inventory: Separate

Invoices: Separate numbering

Reports: Separate

Firm 2

Products: Pharmaceutical Ingredients

Inventory: Separate

Invoices: Separate numbering

Reports: Separate

Each company should operate as if it has its own dedicated ERP while sharing the same platform.

Shared Master Data

The system should support configurable shared master records where appropriate, such as:

Customers

Salespeople

Manufacturers

Transporters

The administrator should decide whether a record belongs to:

Only one company, or

Multiple companies.

Company-Aware User Permissions

Users may have access to:

Only Firm 1

Firm 1 & Firm 2

All Firms

The system should display only the data for companies the user is authorized to access.

Consolidated Owner Dashboard

The owner should have a bird's-eye view of the entire business with a consolidated dashboard showing:

Total Revenue (All Firms)

Revenue by Firm

Inventory Value by Firm

Outstanding Receivables by Firm

Sales Performance by Firm

Low Stock Alerts by Firm

Pending Dispatches by Firm

Monthly Growth by Firm

Interactive charts should allow drilling down from the consolidated view into individual company details.

Company Branding & Compliance

Each firm should have its own:

Company Name

Logo

GST Number

Address

Invoice Template

Invoice Number Series

Email Signature

WhatsApp Templates

Banking Details

Whenever a user creates an invoice or document, the branding and legal details of the selected company should be applied automatically.

UI/UX Expectations

The company switcher should be highly visible in the navigation (similar to ERPNext, Zoho One, or Odoo's multi-company selector). Switching between firms should be instant and should update every module—including CRM, Inventory, Billing, Analytics, and Reports—without requiring the user to log out or open another application.

The overall experience should make the owner feel like they are managing four independent businesses from one intelligent ERP platform while still having the ability to view consolidated business performance whenever needed.

keep the ui minimalistic and clean no need to much also design based on simplicity and peace if i see i need to be able to relax not get frustrated

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/041a09a8-7022-4cab-b3d5-c31b14d74f9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
