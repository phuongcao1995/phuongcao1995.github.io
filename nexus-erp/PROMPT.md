# Build a Complete Business Management & Finance ERP Web Application

Create a **modern, professional, responsive Business Management & Finance ERP web application** for a medium-sized company.

The application should feel like a real commercial ERP system rather than a simple HTML demo.

The system should cover the complete business workflow:

**Customer → Sales → Quotation → Sales Order → Inventory → Delivery → Invoice → Payment → Finance → Accounting**

and:

**Supplier → Purchase → Purchase Order → Goods Receipt → Inventory → Supplier Invoice → Payment → Accounting**

Also include:

**Projects → Tasks → Project Expenses → Project Revenue → Project Profitability**

---

# 1. Technology Requirements

Use **ONLY**:

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

Do NOT use:

* React
* Angular
* Vue
* Svelte
* jQuery
* Bootstrap
* Tailwind CSS
* Material UI
* Any frontend framework
* Any backend
* Any database
* Any external build system

The application must run directly by opening:

```text
index.html
```

Use:

```text
index.html
style.css
script.js
```

You may split JavaScript into multiple `.js` files if necessary, but keep the project simple and dependency-free.

Use JavaScript to simulate:

* Database
* API calls
* CRUD operations
* Authentication
* Notifications
* Business calculations
* Reports
* Search
* Filtering
* Pagination
* Status changes

Use realistic mock data.

Persist data using **localStorage** so that changes remain after refreshing the browser.

---

# 2. Application Concept

Build an ERP system called:

**NEXUS ERP**

Subtitle:

**Business Management & Finance Platform**

The system should be designed for companies that need to manage:

* Customers
* Suppliers
* Products
* Sales
* Orders
* Inventory
* Purchasing
* Billing
* Payments
* Finance
* Accounting
* Projects
* Employees
* Reports

The UI should look like a modern SaaS/ERP application.

Take general inspiration from:

* SAP
* Microsoft Dynamics
* Oracle NetSuite
* Odoo
* Zoho
* Salesforce

Do not copy their exact UI.

Create an original professional interface.

---

# 3. Global Layout

Use a standard ERP layout.

## Left Sidebar

Display:

```text
NEXUS ERP
────────────────────

Dashboard

BUSINESS
  Customers
  Sales
  Orders
  Products
  Inventory
  Suppliers
  Purchasing

FINANCE
  Billing
  Payments
  Expenses
  Finance

ACCOUNTING
  Chart of Accounts
  Journal Entries
  General Ledger
  Accounts Receivable
  Accounts Payable
  Financial Reports

OPERATIONS
  Projects
  Tasks
  Employees

REPORTS
  Sales Reports
  Inventory Reports
  Financial Reports
  Accounting Reports

SYSTEM
  Notifications
  Settings
```

Sidebar requirements:

* Collapsible
* Icons
* Active menu state
* Nested menu support
* Tooltips when collapsed
* Mobile responsive

---

# 4. Top Header

Create a professional top navigation bar.

Include:

* Hamburger button
* Breadcrumb
* Global search
* Notification icon
* Help icon
* User avatar
* User name
* Company selector
* Theme toggle

Example:

```text
☰   Dashboard / Sales

[ Search customers, orders, invoices... ]

🔔  ?   AC
       Alex Carter
       Administrator
```

---

# 5. Dashboard

Create a comprehensive business dashboard.

## KPI Cards

Display:

### Revenue

```text
$248,650
+12.8%
vs previous month
```

### Expenses

```text
$126,420
+4.3%
```

### Net Profit

```text
$122,230
+18.6%
```

### Cash Balance

```text
$184,500
```

### Accounts Receivable

```text
$72,340
```

### Accounts Payable

```text
$43,820
```

### Inventory Value

```text
$156,430
```

### Outstanding Invoices

```text
24
```

---

# 6. Dashboard Charts

Create charts using **pure HTML/CSS/JavaScript**.

Do not use Chart.js or external libraries.

Include:

## Revenue vs Expenses

Line/bar chart:

```text
Jan Feb Mar Apr May Jun Jul Aug Sep
```

Show:

* Revenue
* Expenses
* Profit

## Sales by Category

Pie/donut-style chart.

Categories:

* Electronics
* Software
* Services
* Equipment
* Office Supplies

## Sales Pipeline

Show:

```text
Leads
   ↓
Quotation
   ↓
Order
   ↓
Delivery
   ↓
Invoice
   ↓
Paid
```

## Recent Transactions

Display:

* Transaction ID
* Customer
* Type
* Amount
* Date
* Status

## Recent Orders

Display:

* Order number
* Customer
* Date
* Amount
* Status

## Low Stock

Display products approaching minimum stock.

---

# 7. Customer Management

Create a complete Customer module.

## Customer List

Columns:

```text
Customer ID
Customer
Company
Email
Phone
Country
Sales
Outstanding
Status
Actions
```

Features:

* Search
* Filter
* Sort
* Pagination
* Add customer
* Edit customer
* Delete customer
* View customer
* Export

## Customer Detail

Create tabs:

```text
Overview
Contacts
Orders
Invoices
Payments
Projects
Transactions
Notes
```

Show:

* Customer information
* Total sales
* Outstanding balance
* Last order
* Credit limit
* Payment terms

---

# 8. Sales Module

Create a complete sales management system.

## Sales Dashboard

Show:

* Total sales
* Monthly sales
* Sales target
* Conversion rate
* Average order value
* Top customers
* Top products

## Quotations

Features:

* Create quotation
* Edit quotation
* Delete quotation
* Send quotation
* Convert quotation to order
* Print quotation

Status:

```text
Draft
Sent
Accepted
Rejected
Expired
Converted
```

Quotation fields:

```text
Quotation #
Customer
Date
Expiration Date
Salesperson
Products
Quantity
Unit Price
Discount
Tax
Subtotal
Total
Notes
Terms
```

---

# 9. Sales Orders

Create a complete Order Management module.

## Order List

Columns:

```text
Order #
Customer
Order Date
Salesperson
Items
Subtotal
Tax
Total
Payment Status
Fulfillment Status
Order Status
Actions
```

Statuses:

```text
Draft
Confirmed
Processing
Ready
Shipped
Delivered
Completed
Cancelled
```

## Order Detail

Display:

### Customer

```text
Customer
Billing Address
Shipping Address
Payment Terms
```

### Order Items

```text
Product
SKU
Quantity
Unit Price
Discount
Tax
Total
```

### Summary

```text
Subtotal
Discount
Tax
Shipping
Grand Total
Paid
Balance
```

---

# 10. Product Management

Create Products module.

## Product List

Fields:

```text
SKU
Product
Category
Brand
Unit
Cost
Selling Price
Stock
Reorder Level
Status
```

Features:

* Add product
* Edit product
* Delete product
* Search
* Filter
* Import
* Export

## Product Detail

Tabs:

```text
Overview
Inventory
Sales
Purchases
Pricing
Transactions
```

---

# 11. Inventory Management

Create a complete inventory system.

## Inventory Dashboard

Display:

* Total inventory value
* Total products
* Low stock products
* Out-of-stock products
* Stock turnover
* Warehouse value

## Warehouses

Support:

```text
Main Warehouse
North Warehouse
South Warehouse
Retail Store
```

## Stock Movements

Types:

```text
Purchase Receipt
Sales Delivery
Stock Adjustment
Transfer
Return
Opening Balance
```

Columns:

```text
Date
Reference
Product
Warehouse
Type
Quantity
Before
After
User
```

## Stock Transfer

Allow:

```text
From Warehouse
To Warehouse
Product
Quantity
Reason
```

Calculate inventory automatically.

---

# 12. Supplier Management

Create Supplier module.

Supplier list:

```text
Supplier ID
Company
Contact
Email
Phone
Total Purchases
Outstanding
Payment Terms
Status
```

Supplier detail:

```text
Overview
Purchase Orders
Invoices
Payments
Products
Transactions
```

---

# 13. Purchasing Module

Create complete purchasing workflow.

## Purchase Request

Fields:

```text
Request #
Requester
Department
Date
Items
Reason
Status
```

## Purchase Order

Fields:

```text
PO Number
Supplier
Order Date
Expected Delivery
Warehouse
Payment Terms
Products
Quantity
Unit Cost
Discount
Tax
Total
```

Statuses:

```text
Draft
Pending Approval
Approved
Ordered
Partially Received
Received
Cancelled
```

## Goods Receipt

Fields:

```text
Receipt #
Purchase Order
Supplier
Warehouse
Received Date
Product
Ordered Qty
Received Qty
Rejected Qty
```

Receiving goods should increase inventory.

---

# 14. Billing & Invoicing

Create a complete invoice module.

## Invoice List

Columns:

```text
Invoice #
Customer
Invoice Date
Due Date
Amount
Paid
Balance
Status
Actions
```

Statuses:

```text
Draft
Sent
Partially Paid
Paid
Overdue
Cancelled
```

## Invoice Creation

Fields:

```text
Customer
Invoice Date
Due Date
Payment Terms
Products / Services
Quantity
Unit Price
Discount
Tax
Subtotal
Total
Notes
Terms
```

Automatically calculate:

```text
Subtotal
Discount
Tax
Grand Total
Amount Paid
Remaining Balance
```

---

# 15. Invoice Detail / Printable Invoice

Create a professional invoice layout.

Header:

```text
NEXUS ERP
Business Management & Finance

INVOICE #INV-2026-00125
```

Include:

```text
Bill To
Ship To

Invoice Date
Due Date
Payment Terms
```

Table:

```text
Description | Qty | Unit Price | Discount | Tax | Total
```

Footer:

```text
Subtotal
Discount
Tax
Grand Total
Paid
Balance Due
```

Include buttons:

```text
Print
Download
Send
Record Payment
```

Printing should use browser print functionality.

---

# 16. Payment Management

Create Payments module.

Support:

```text
Customer Payment
Supplier Payment
Invoice Payment
Refund
Advance Payment
```

Payment fields:

```text
Payment #
Date
Customer/Supplier
Reference
Payment Method
Account
Amount
Notes
Status
```

Payment methods:

```text
Cash
Bank Transfer
Credit Card
Debit Card
Check
Other
```

When a customer payment is recorded:

* Update invoice paid amount
* Update invoice balance
* Update invoice status
* Create accounting transaction

---

# 17. Expense Management

Create Expenses module.

Fields:

```text
Expense #
Date
Category
Vendor
Description
Amount
Tax
Payment Method
Account
Project
Status
```

Categories:

```text
Office
Travel
Marketing
Utilities
Salary
Software
Equipment
Rent
Other
```

---

# 18. Finance Dashboard

Create a dedicated Finance dashboard.

Display:

* Cash balance
* Bank balance
* Accounts receivable
* Accounts payable
* Revenue
* Expenses
* Net cash flow
* Monthly cash flow

Charts:

```text
Cash Flow
Revenue vs Expense
AR Aging
AP Aging
```

---

# 19. Accounts Receivable

Create AR module.

Display:

```text
Customer
Invoice
Invoice Date
Due Date
Original Amount
Paid
Balance
Days Overdue
Status
```

Create aging categories:

```text
Current
1–30 Days
31–60 Days
61–90 Days
90+ Days
```

---

# 20. Accounts Payable

Create AP module.

Display:

```text
Supplier
Invoice
Invoice Date
Due Date
Amount
Paid
Balance
Days Overdue
Status
```

---

# 21. Accounting

Create a realistic accounting module.

## Chart of Accounts

Categories:

```text
1000 Assets
2000 Liabilities
3000 Equity
4000 Revenue
5000 Cost of Goods Sold
6000 Operating Expenses
```

Example accounts:

```text
1010 Cash
1020 Bank
1100 Accounts Receivable
1200 Inventory

2010 Accounts Payable
2100 Taxes Payable

3010 Owner Equity
3100 Retained Earnings

4010 Product Sales
4020 Service Revenue

5010 Cost of Goods Sold

6010 Salaries
6020 Rent
6030 Utilities
6040 Marketing
```

---

# 22. Journal Entries

Create Journal Entry screen.

Fields:

```text
Journal #
Date
Reference
Description
```

Lines:

```text
Account
Description
Debit
Credit
```

Validation:

```text
Total Debit = Total Credit
```

Show error if they do not balance.

---

# 23. General Ledger

Display:

```text
Date
Journal #
Account
Description
Debit
Credit
Balance
```

Allow:

* Account filter
* Date filter
* Search
* Export

---

# 24. Financial Reports

Create professional financial reports.

## Profit & Loss

Display:

```text
Revenue
  Product Sales
  Service Revenue

Total Revenue

Cost of Goods Sold

Gross Profit

Operating Expenses
  Salaries
  Rent
  Utilities
  Marketing
  Software

Total Operating Expenses

Net Profit
```

## Balance Sheet

Display:

```text
ASSETS

Cash
Bank
Accounts Receivable
Inventory

Total Assets

LIABILITIES

Accounts Payable
Taxes Payable

Total Liabilities

EQUITY

Owner Equity
Retained Earnings

Total Equity
```

Validate:

```text
Assets = Liabilities + Equity
```

## Cash Flow

Display:

```text
Operating Activities
Investing Activities
Financing Activities

Net Cash Flow
```

---

# 25. Project Management

Create Project Management module.

## Project List

Fields:

```text
Project #
Project Name
Customer
Manager
Start Date
End Date
Budget
Actual Cost
Revenue
Profit
Progress
Status
```

Statuses:

```text
Planning
Active
On Hold
Completed
Cancelled
```

## Project Detail

Tabs:

```text
Overview
Tasks
Team
Budget
Expenses
Revenue
Documents
Activity
```

---

# 26. Task Management

Create task management.

Fields:

```text
Task
Project
Assigned To
Priority
Start Date
Due Date
Progress
Status
```

Statuses:

```text
To Do
In Progress
Review
Completed
Blocked
```

Priorities:

```text
Low
Medium
High
Critical
```

Provide:

* List view
* Kanban view

---

# 27. Employee Management

Create a simple Employee module.

Fields:

```text
Employee ID
Name
Department
Position
Email
Phone
Manager
Status
```

Employees can be assigned to:

* Sales
* Projects
* Tasks
* Expenses

---

# 28. Reports

Create a Reports center.

Categories:

### Sales

* Sales by month
* Sales by customer
* Sales by product
* Sales by salesperson

### Inventory

* Stock valuation
* Stock movement
* Low stock
* Inventory turnover

### Purchasing

* Purchases by supplier
* Purchase by product
* Purchase spending

### Finance

* Cash flow
* Revenue
* Expenses
* AR
* AP

### Accounting

* Trial Balance
* General Ledger
* Profit & Loss
* Balance Sheet
* Cash Flow

Every report should support:

* Date range
* Filters
* Search
* Print
* Export CSV

---

# 29. Notifications

Create a notification center.

Examples:

```text
Invoice INV-001 is overdue.

Product SKU-102 is below reorder level.

Purchase Order PO-104 has been received.

Customer ABC has exceeded the credit limit.

Project PRJ-001 is approaching its deadline.
```

Use notification badges.

---

# 30. Global Search

Implement a global search.

Search across:

```text
Customers
Suppliers
Products
Orders
Invoices
Projects
Employees
Transactions
```

Example:

Searching:

```text
ABC
```

should show:

```text
Customers
ABC Corporation

Orders
ORD-10025

Invoices
INV-10025
```

---

# 31. CRUD Functionality

All major modules must support:

```text
Create
Read
Update
Delete
Search
Filter
Sort
Pagination
View Details
```

Use reusable JavaScript functions.

For example:

```javascript
addCustomer()
updateCustomer()
deleteCustomer()
searchCustomers()
filterCustomers()
```

Do not duplicate unnecessary code.

---

# 32. Local Storage

Use localStorage for mock persistence.

Example:

```javascript
localStorage.setItem(
    "customers",
    JSON.stringify(customers)
);
```

Create storage helpers:

```javascript
saveData()
loadData()
removeData()
clearData()
```

Initialize sample data when no data exists.

---

# 33. Business Logic

Implement realistic calculations.

Examples:

### Sales Order

```text
Subtotal =
SUM(quantity × unitPrice)

Discount =
Subtotal × discountRate

Tax =
(Subtotal - Discount) × taxRate

Grand Total =
Subtotal - Discount + Tax
```

### Invoice

```text
Balance =
Grand Total - Amount Paid
```

### Project

```text
Profit =
Revenue - Actual Cost
```

### Inventory

```text
Available Stock =
Opening Stock
+ Purchases
+ Transfers In
- Sales
- Transfers Out
- Adjustments
```

### Accounting

Every financial transaction should conceptually generate corresponding debit/credit entries.

---

# 34. Data Relationships

The mock data should have realistic relationships.

For example:

```text
Customer
   ↓
Quotation
   ↓
Sales Order
   ↓
Delivery
   ↓
Invoice
   ↓
Payment
   ↓
Accounting Journal
```

Purchase:

```text
Supplier
   ↓
Purchase Order
   ↓
Goods Receipt
   ↓
Supplier Invoice
   ↓
Payment
   ↓
Accounting Journal
```

Project:

```text
Customer
   ↓
Project
   ↓
Tasks
   ↓
Expenses
   ↓
Revenue
   ↓
Profitability
```

---

# 35. Tables

Create reusable professional tables.

Features:

* Sticky headers
* Hover states
* Row selection
* Checkbox
* Sorting
* Search
* Pagination
* Page size
* Empty state
* Loading state
* Status badges
* Action menu

Example action menu:

```text
View
Edit
Duplicate
Print
Delete
```

---

# 36. Forms

Create reusable form components.

Support:

* Text input
* Number input
* Date input
* Select
* Multi-select
* Checkbox
* Radio
* Textarea
* File upload UI
* Currency input

Validation:

* Required fields
* Invalid email
* Invalid numbers
* Negative values
* Date validation
* Duplicate IDs

Display validation errors clearly.

---

# 37. Modal System

Create reusable modal dialogs.

Examples:

```text
Add Customer
Edit Customer
Add Product
Create Order
Create Invoice
Record Payment
Add Expense
Create Journal Entry
```

Do not use browser `alert()` for normal UI.

Create professional confirmation dialogs.

---

# 38. Toast Notifications

Create toast messages.

Examples:

```text
✓ Customer created successfully

✓ Invoice updated successfully

✓ Payment recorded successfully

⚠ Product stock is low

✕ Unable to save record
```

---

# 39. Responsive Design

The application must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

Desktop:

```text
Sidebar + Main Content
```

Tablet:

```text
Collapsible Sidebar
```

Mobile:

```text
Top Navigation
Bottom/Drawer Navigation
Single-column cards
Responsive tables
```

---

# 40. Theme

Create a professional business UI.

Use:

* Neutral background
* White cards
* Clear borders
* Subtle shadows
* Consistent spacing
* Professional typography
* Green/blue accent colors
* Red for errors
* Yellow/orange for warnings
* Green for success

Support:

```text
Light Mode
Dark Mode
```

Store theme preference in localStorage.

---

# 41. Accessibility

Implement:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Proper labels
* ARIA where appropriate
* Sufficient contrast
* Accessible buttons
* Accessible modal dialogs

---

# 42. Sample Data

Create enough realistic data to make the application look populated.

At minimum:

```text
20 Customers
15 Suppliers
50 Products
30 Sales Orders
20 Purchase Orders
30 Invoices
20 Payments
30 Expenses
10 Projects
50 Tasks
50 Inventory Transactions
100 Accounting Transactions
```

Use realistic company names, products, prices, dates, statuses, and relationships.

Do not use lorem ipsum.

---

# 43. Navigation

Every major menu item must actually work.

Clicking:

```text
Customers
```

should open the customer page.

Clicking:

```text
Orders
```

should open the order management page.

Clicking:

```text
Invoice
```

should open invoices.

Do not create navigation links that lead to empty placeholder pages.

---

# 44. SPA-like Navigation

Although this is a static application, make it feel like a Single Page Application.

Use JavaScript to:

```text
navigateTo("customers")
navigateTo("orders")
navigateTo("invoices")
```

Update the main content dynamically without reloading the page.

Maintain:

* Active sidebar item
* Breadcrumb
* Page title
* Page state

Browser back/forward navigation should work if practical.

---

# 45. Dashboard Interactivity

Dashboard widgets should be interactive.

For example:

Click:

```text
Outstanding Invoices
```

→ open invoice page filtered by unpaid invoices.

Click:

```text
Low Stock
```

→ open inventory page filtered by low-stock products.

Click:

```text
Accounts Receivable
```

→ open AR page.

Click:

```text
Revenue
```

→ open sales report.

---

# 46. Export

Implement client-side CSV export.

Example:

```text
Export Customers
Export Orders
Export Products
Export Invoices
Export Payments
Export Reports
```

Use JavaScript Blob API.

No external library.

---

# 47. Print

Support browser printing for:

* Invoice
* Quotation
* Sales Order
* Purchase Order
* Financial reports
* Customer statements

Use print-specific CSS:

```css
@media print {
    ...
}
```

---

# 48. Customer Statement

Create a customer statement page.

Display:

```text
Customer
Opening Balance

Date | Reference | Description | Debit | Credit | Balance
```

At bottom:

```text
Total Invoiced
Total Paid
Outstanding Balance
```

---

# 49. Supplier Statement

Similar to customer statement.

Display:

```text
Opening Balance
Purchases
Payments
Credits
Outstanding Balance
```

---

# 50. Settings

Create Settings module.

Sections:

```text
Company
Users
Roles
Currency
Tax
Payment Terms
Warehouses
Invoice Settings
Notifications
Appearance
```

Company information:

```text
Company Name
Address
Phone
Email
Website
Tax Number
Currency
Fiscal Year
```

---

# 51. User & Role UI

Create simulated role management.

Roles:

```text
Administrator
Finance Manager
Sales Manager
Sales Representative
Inventory Manager
Purchasing Manager
Project Manager
Accountant
Viewer
```

Permissions:

```text
View
Create
Edit
Delete
Approve
Export
```

The UI should demonstrate permission-based menu visibility.

---

# 52. Demo Login

Create a simple demo login screen.

Example:

```text
NEXUS ERP

Email
Password

[ Sign In ]

Demo:
admin@nexuserp.com
admin123
```

This is only frontend simulation.

No real authentication is required.

---

# 53. Error Handling

Implement graceful UI states:

```text
Loading
Empty
Error
Success
No Search Results
No Permission
```

Example:

```text
No invoices found.

Try changing your search or filters.
```

---

# 54. Code Quality

Keep the code:

* Clean
* Modular
* Readable
* Maintainable
* Reusable
* Well commented where necessary

Avoid:

* Huge duplicated functions
* Inline styles everywhere
* Hardcoded HTML for every record
* Unnecessary complexity
* Framework-like abstractions

Create reusable functions for:

```text
renderTable()
renderModal()
showToast()
formatCurrency()
formatDate()
paginate()
filterData()
sortData()
saveData()
loadData()
navigateTo()
```

---

# 55. Folder Structure

Use this structure:

```text
nexus-erp/
│
├── index.html
├── style.css
├── script.js
│
├── assets/
│   ├── logo.svg
│   └── icons/
│
└── README.md
```

If JavaScript becomes too large, it is acceptable to organize it as:

```text
js/
├── app.js
├── data.js
├── storage.js
├── navigation.js
├── components.js
├── dashboard.js
├── customers.js
├── sales.js
├── orders.js
├── inventory.js
├── purchasing.js
├── billing.js
├── finance.js
├── accounting.js
├── projects.js
└── reports.js
```

Still use only vanilla JavaScript.

---

# 56. Important UX Requirement

The application must **not look like a collection of unrelated demo pages**.

The modules must work together.

For example:

### Scenario 1 — Sales

```text
Create Customer
      ↓
Create Quotation
      ↓
Accept Quotation
      ↓
Create Sales Order
      ↓
Reserve Inventory
      ↓
Deliver Products
      ↓
Create Invoice
      ↓
Record Payment
      ↓
Update Accounting
```

### Scenario 2 — Purchasing

```text
Create Supplier
      ↓
Create Purchase Order
      ↓
Receive Products
      ↓
Increase Inventory
      ↓
Create Supplier Invoice
      ↓
Record Supplier Payment
      ↓
Update Accounting
```

### Scenario 3 — Project

```text
Create Customer
      ↓
Create Project
      ↓
Create Tasks
      ↓
Assign Employees
      ↓
Record Project Expenses
      ↓
Record Project Revenue
      ↓
Calculate Project Profit
```

---

# 57. Final UI Quality

The final result should look like a **real enterprise ERP application**.

Avoid:

* Basic HTML tables with no styling
* Generic bootstrap-looking pages
* Empty dashboards
* Fake buttons that do nothing
* Broken navigation
* Placeholder text
* Excessive gradients
* Excessive animations
* Unnecessary visual effects

Focus on:

**Professional + Clean + Practical + Data-rich + Usable**

The user should be able to open `index.html` and immediately interact with a realistic business ERP system.

---

# 58. Final Acceptance Criteria

Before finishing, verify:

* [ ] Dashboard works
* [ ] Sidebar navigation works
* [ ] Customers CRUD works
* [ ] Suppliers CRUD works
* [ ] Products CRUD works
* [ ] Sales works
* [ ] Quotations work
* [ ] Orders work
* [ ] Inventory works
* [ ] Purchasing works
* [ ] Billing works
* [ ] Invoices work
* [ ] Payments work
* [ ] Expenses work
* [ ] Finance dashboard works
* [ ] Accounts Receivable works
* [ ] Accounts Payable works
* [ ] Accounting works
* [ ] Journal entries work
* [ ] General Ledger works
* [ ] P&L works
* [ ] Balance Sheet works
* [ ] Cash Flow works
* [ ] Projects work
* [ ] Tasks work
* [ ] Reports work
* [ ] Search works
* [ ] Filters work
* [ ] Sorting works
* [ ] Pagination works
* [ ] Modals work
* [ ] Toast notifications work
* [ ] LocalStorage persistence works
* [ ] CSV export works
* [ ] Printing works
* [ ] Light/Dark mode works
* [ ] Responsive design works
* [ ] Demo login works
* [ ] No broken links
* [ ] No console errors
* [ ] No external frontend frameworks
* [ ] No backend required

Most importantly, **implement the functionality instead of only creating the visual layout**. All major buttons, forms, tables, filters, navigation, calculations, and workflows should work with the mock data.
