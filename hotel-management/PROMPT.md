Create a **modern, professional Hotel Management System (HMS) web application** for hotels and resorts.

## 1. Technical Requirements

Build the application as a **static frontend web application**.

**Strict requirements:**

* Use only:

  * HTML5
  * CSS3
  * Vanilla JavaScript
* Do NOT use:

  * React
  * Angular
  * Vue
  * TypeScript
  * Node.js
  * PHP
  * Python
  * Backend APIs
  * Database
  * Server-side code
* The application must run directly by opening `index.html`.
* Use JavaScript with mock/sample data to simulate real hotel operations.
* Use `localStorage` where useful to persist demo data.
* Organize the project into clean, maintainable files.
* Use reusable UI components through JavaScript where practical.
* The UI should be responsive for:

  * Desktop
  * Tablet
  * Mobile

The application language should be **English**, but the design and data model must be suitable for hotels operating in **Vietnam**.

Use Vietnamese examples for:

* Customer names
* Phone numbers
* Addresses
* Room names
* Hotel branches
* Vietnamese currency (VND)
* Tax/VAT
* Payment methods
* Vietnamese ID/passport examples

---

# 2. Application Goal

Create an all-in-one **Hotel Management System** that can manage:

* Hotel dashboard
* Reservations
* Front Desk
* Rooms
* Guests
* Check-in / Check-out
* Housekeeping
* Room maintenance
* Payments
* Invoices
* Billing
* Services
* Restaurants
* Minibar
* Customers
* Staff
* Reports
* Revenue
* Expenses
* Inventory
* Suppliers
* Promotions
* Room rates
* Hotel settings

The application should feel like a real commercial hotel management product rather than a simple demo website.

---

# 3. Main Layout

Create a professional admin dashboard layout.

### Left Sidebar

Include:

1. Dashboard
2. Front Desk
3. Reservations
4. Calendar
5. Rooms
6. Guests
7. Housekeeping
8. Maintenance
9. Services
10. Restaurant
11. Billing
12. Payments
13. Customers
14. Staff
15. Inventory
16. Suppliers
17. Promotions
18. Reports
19. Finance
20. Settings

The sidebar should:

* Support expandable/collapsible menus
* Show icons
* Highlight the active module
* Work well on mobile
* Have a mobile drawer/sidebar

---

# 4. Top Navigation

Create a top navigation bar containing:

* Hotel/branch selector
* Global search
* Notifications
* Current date/time
* Language selector
* User profile
* User role
* Dark/light mode toggle

Example:

Hotel: **Sunrise Da Nang Hotel**

User:

**Nguyen Van An**
Front Office Manager

---

# 5. Dashboard

Create a comprehensive hotel dashboard.

Show KPI cards:

* Total Rooms
* Available Rooms
* Occupied Rooms
* Dirty Rooms
* Maintenance Rooms
* Today's Check-ins
* Today's Check-outs
* Today's Reservations
* Occupancy Rate
* ADR
* RevPAR
* Today's Revenue

Example:

```
Total Rooms       120
Occupied           87
Available          23
Maintenance        10

Occupancy Rate     72.5%
ADR                1,250,000 VND
RevPAR              906,250 VND
Today's Revenue   108,500,000 VND
```

Include charts:

* Revenue by day
* Occupancy trend
* Room status
* Booking sources
* Revenue by department
* Room type performance

Use pure JavaScript chart rendering or simple CSS/SVG charts. Do not require external frameworks.

---

# 6. Front Desk

Create a Front Desk module for daily hotel operations.

Features:

* Today's arrivals
* Today's departures
* Current guests
* Walk-in guest
* Room assignment
* Quick check-in
* Quick check-out
* Room transfer
* Extend stay
* Early check-in
* Late check-out
* Guest notes
* Special requests

Create a room status board:

* Available
* Reserved
* Occupied
* Dirty
* Cleaning
* Inspected
* Out of Order
* Out of Service

Use different visual indicators for each status.

---

# 7. Reservation Management

Create a reservation management module.

Features:

* Reservation list
* Create reservation
* Edit reservation
* Cancel reservation
* Confirm reservation
* No-show
* Modify reservation
* Room assignment
* Rate plan
* Number of adults
* Number of children
* Check-in date
* Check-out date
* Number of nights
* Booking source
* Special requests
* Deposit
* Payment status

Booking sources:

* Direct
* Website
* Phone
* Walk-in
* Booking.com
* Agoda
* Expedia
* Travel Agent
* Corporate

Reservation statuses:

* Pending
* Confirmed
* Checked-in
* Checked-out
* Cancelled
* No-show

---

# 8. Reservation Calendar

Create a visual hotel booking calendar.

Display:

* Rooms vertically
* Dates horizontally
* Reservations as colored blocks

Allow:

* Drag-and-drop style simulation
* Room transfer
* Date extension
* Reservation details popup
* Filter by room type
* Filter by status
* Filter by floor

Example:

```
              Sep 28   Sep 29   Sep 30   Oct 01
Room 101      [Guest A----------------]
Room 102               [Guest B-------------]
Room 103      [Guest C--------]
Room 201                        [Guest D------]
```

---

# 9. Room Management

Create a room management module.

Room information:

* Room number
* Room type
* Floor
* Building
* Bed type
* Capacity
* Price
* Status
* Amenities
* Cleaning status
* Maintenance status

Example room types:

* Standard Single
* Standard Double
* Deluxe
* Superior
* Family Room
* Suite
* Presidential Suite

Room statuses:

* Available
* Reserved
* Occupied
* Dirty
* Cleaning
* Inspected
* Maintenance
* Out of Order

Provide:

* Room list
* Room grid
* Room details
* Add room
* Edit room
* Disable room

---

# 10. Guest Management

Create a guest management module.

Guest information:

* Guest ID
* Full name
* Gender
* Date of birth
* Nationality
* Phone
* Email
* Address
* ID/Passport number
* Check-in history
* Stay history
* Preferences
* Notes
* VIP status

Support:

* Individual guests
* Couples
* Families
* Groups
* Corporate guests

Create a guest profile page with:

* Personal information
* Current reservation
* Previous stays
* Payments
* Requests
* Notes

---

# 11. Check-in

Create a complete check-in workflow.

Steps:

1. Search reservation
2. Select guest
3. Verify guest information
4. Select room
5. Confirm rate
6. Add extra services
7. Collect deposit
8. Confirm check-in

Display a check-in confirmation screen.

Support:

* Walk-in check-in
* Multiple guests
* Group check-in
* ID/passport information
* Deposit
* Special requests

---

# 12. Check-out

Create a complete check-out workflow.

Show:

* Room charges
* Extra services
* Restaurant charges
* Minibar
* Laundry
* Taxes
* Discounts
* Deposit
* Total amount
* Paid amount
* Remaining balance

Example:

```
Room Charge             3,600,000 VND
Restaurant                450,000 VND
Minibar                   180,000 VND
Laundry                   120,000 VND
---------------------------------------
Subtotal                4,350,000 VND
VAT 10%                   435,000 VND
Discount                 -200,000 VND
---------------------------------------
Total                   4,585,000 VND
Deposit                -1,000,000 VND
---------------------------------------
Remaining               3,585,000 VND
```

---

# 13. Housekeeping

Create a Housekeeping module.

Features:

* Room cleaning board
* Assign room attendant
* Cleaning status
* Priority
* Inspection
* Lost & found
* Housekeeping notes

Statuses:

* Dirty
* Cleaning
* Clean
* Inspected
* Maintenance

Display housekeeping tasks by:

* Floor
* Room
* Staff
* Priority

Allow staff to update status.

---

# 14. Maintenance

Create a maintenance management module.

Features:

* Maintenance requests
* Room maintenance
* Equipment maintenance
* Preventive maintenance
* Assign technician
* Priority
* Status
* Cost
* Notes

Statuses:

* Open
* Assigned
* In Progress
* Waiting Parts
* Completed
* Cancelled

---

# 15. Hotel Services

Create a service management module.

Examples:

* Airport transfer
* Laundry
* Spa
* Massage
* Extra bed
* Breakfast
* Bicycle rental
* Car rental
* Room service
* Late checkout

Each service should have:

* Service name
* Category
* Price
* Tax
* Unit
* Availability
* Description

Allow services to be added directly to a guest's bill.

---

# 16. Restaurant Management

Create a basic restaurant/POS module.

Features:

* Tables
* Orders
* Menu
* Categories
* Food items
* Drinks
* Order status
* Guest room charging
* Payment

Order statuses:

* New
* Preparing
* Ready
* Served
* Paid
* Cancelled

Allow restaurant charges to be posted to a hotel room.

---

# 17. Billing

Create a complete billing module.

Features:

* Guest folio
* Invoice
* Invoice items
* Taxes
* Discounts
* Deposits
* Refunds
* Payment status
* Payment history

Payment methods:

* Cash
* Bank Transfer
* Credit Card
* Debit Card
* E-wallet
* QR Payment

For Vietnam, include:

* VND currency
* VAT
* Bank transfer
* QR payment

---

# 18. Payment Management

Create payment records containing:

* Payment ID
* Invoice ID
* Guest
* Amount
* Payment method
* Date
* Reference number
* Status
* Notes

Statuses:

* Paid
* Pending
* Refunded
* Partially Paid

---

# 19. Customer / Corporate Management

Create a CRM-style module.

Manage:

* Individual customers
* Corporate customers
* Travel agencies
* Partners

Information:

* Customer name
* Company
* Contact person
* Phone
* Email
* Address
* Tax ID
* Contract
* Credit limit
* Payment terms
* Booking history

---

# 20. Staff Management

Create staff management.

Information:

* Employee ID
* Name
* Department
* Position
* Phone
* Email
* Status
* Shift
* Role

Departments:

* Front Office
* Housekeeping
* Restaurant
* Kitchen
* Maintenance
* Finance
* Sales
* Management

Roles:

* Administrator
* General Manager
* Front Office Manager
* Receptionist
* Housekeeper
* Accountant
* Cashier
* Maintenance Staff

---

# 21. Inventory

Create inventory management.

Features:

* Products
* Categories
* Stock
* Stock in
* Stock out
* Transfers
* Adjustments
* Low-stock alerts

Examples:

* Towels
* Bedsheets
* Shampoo
* Soap
* Water
* Minibar items
* Cleaning supplies
* Restaurant ingredients
* Office supplies

---

# 22. Suppliers

Create supplier management.

Information:

* Supplier name
* Contact person
* Phone
* Email
* Address
* Tax ID
* Products
* Purchase history
* Payment status

---

# 23. Promotions

Create a promotion management module.

Support:

* Discount percentage
* Fixed discount
* Early booking
* Long stay
* Weekend promotion
* Seasonal promotion
* Corporate rate
* Coupon code

Fields:

* Promotion name
* Code
* Start date
* End date
* Discount
* Applicable room types
* Minimum nights
* Maximum discount

---

# 24. Reports

Create a Reports module with filters.

Reports:

### Occupancy Reports

* Occupancy rate
* Available rooms
* Occupied rooms
* Room nights

### Revenue Reports

* Daily revenue
* Monthly revenue
* Revenue by room
* Revenue by service
* Revenue by restaurant

### Guest Reports

* Guest nationality
* Guest history
* Repeat guests
* VIP guests

### Booking Reports

* Booking source
* Cancellation rate
* No-show
* Average length of stay

### Financial Reports

* Revenue
* Expenses
* Tax
* Payments
* Outstanding balances

Allow:

* Date range
* Export simulation
* Print report
* CSV-style export simulation

---

# 25. Finance

Create a basic hotel finance module.

Include:

* Revenue
* Expenses
* Accounts receivable
* Accounts payable
* Cash flow
* Daily cash report
* Bank transactions
* Tax/VAT
* Profit summary

Dashboard:

```
Revenue        2,450,000,000 VND
Expenses       1,320,000,000 VND
Gross Profit   1,130,000,000 VND
VAT              245,000,000 VND
```

This is a frontend simulation only and is not intended to replace real accounting software.

---

# 26. Settings

Create a comprehensive Settings module.

Sections:

* Hotel information
* Branches
* Room types
* Rate plans
* Tax settings
* Payment methods
* Users
* Roles & permissions
* Notifications
* Currency
* Language
* Date/time format
* System preferences

Default:

* Language: English
* Currency: VND
* Country: Vietnam
* Timezone: Asia/Ho_Chi_Minh
* Date format: DD/MM/YYYY

---

# 27. Search and Filtering

All major tables should support:

* Search
* Filter
* Sort
* Pagination
* Date range
* Status filter
* Export simulation

Use realistic sample data.

---

# 28. Notifications

Create a notification center.

Examples:

* 5 guests arriving today
* Room 203 needs cleaning
* Room 405 is under maintenance
* Low inventory: bottled water
* Payment overdue
* New reservation received
* Check-out due soon

---

# 29. UI / UX Design

Use a modern hotel SaaS/admin dashboard style.

Design principles:

* Clean
* Professional
* Spacious
* Easy to understand
* Business-oriented
* Minimal unnecessary decoration

Use:

* Cards
* Tables
* Badges
* Tabs
* Modals
* Dropdowns
* Forms
* Toast notifications
* Confirmation dialogs
* Breadcrumbs
* Charts
* Calendar
* Status indicators

Use a consistent design system for:

* Colors
* Typography
* Spacing
* Buttons
* Inputs
* Tables
* Cards
* Modals

---

# 30. Responsive Design

The application must work well on:

### Desktop

Full sidebar + dashboard.

### Tablet

Collapsible sidebar.

### Mobile

* Hamburger menu
* Responsive cards
* Horizontally scrollable tables
* Mobile-friendly forms
* Bottom/side navigation where appropriate

---

# 31. Mock Data

Create realistic Vietnamese hotel sample data.

Example:

Hotel:

**Sunrise Da Nang Hotel**

Location:

**Vo Nguyen Giap Street, Da Nang, Vietnam**

Sample guests:

* Nguyen Van An
* Tran Thi Mai
* Le Hoang Nam
* Pham Minh Anh

Use realistic:

* Vietnamese phone numbers
* VND prices
* Vietnamese addresses
* Booking dates
* Room numbers
* Reservation data

Create enough mock data so that every page looks realistic and populated.

---

# 32. JavaScript Functionality

Even though this is a static application, interactions should work.

Implement:

* Navigation between modules
* Modal open/close
* Add/edit/delete records
* Search
* Filtering
* Sorting
* Pagination
* Tabs
* Dropdowns
* Form validation
* Toast notifications
* Status changes
* Check-in simulation
* Check-out simulation
* Reservation creation
* Room assignment
* Payment recording
* Invoice calculation
* Dashboard KPI updates
* localStorage persistence

For example:

When a reservation is created:

1. Add reservation to mock data.
2. Update reservation list.
3. Update calendar.
4. Update room status.
5. Update dashboard statistics.
6. Show success notification.

---

# 33. Important Business Rules

Implement basic hotel business logic.

Examples:

* A room cannot have two overlapping reservations.
* Check-out date must be after check-in date.
* Occupied rooms cannot be assigned to another guest.
* Maintenance rooms cannot be reserved.
* Total nights = check-out date - check-in date.
* Room charge = nightly rate × number of nights.
* Invoice total = subtotal + tax - discount.
* Remaining balance = total - payments.
* A room becomes available after successful check-out.
* A checked-out room becomes dirty and requires housekeeping.
* A room can be marked available only after cleaning/inspection.

---

# 34. Demo Login

Create a simple frontend-only login screen.

Demo accounts:

```
admin / admin123
manager / manager123
reception / reception123
housekeeping / house123
```

This is only a UI simulation. Do not implement real authentication.

Different roles should show different menus where practical.

---

# 35. File Structure

Use a clean structure such as:

```text
hotel-management/
│
├── index.html
│
├── css/
│   ├── style.css
│   ├── dashboard.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── data.js
│   ├── storage.js
│   ├── utils.js
│   ├── dashboard.js
│   ├── reservations.js
│   ├── rooms.js
│   ├── guests.js
│   ├── frontdesk.js
│   ├── housekeeping.js
│   ├── billing.js
│   ├── payments.js
│   ├── services.js
│   ├── restaurant.js
│   ├── inventory.js
│   ├── reports.js
│   └── settings.js
│
└── assets/
    ├── images/
    └── icons/
```

---

# 36. Code Quality

Write clean and maintainable code.

Requirements:

* Semantic HTML5
* CSS variables
* Reusable CSS classes
* Modular JavaScript
* Clear function names
* Avoid duplicated code
* Avoid global variables where possible
* Add comments for important business logic
* Validate user input
* Handle empty states
* Handle errors gracefully
* No console errors

Do not create unnecessarily complex architecture.

---

# 37. Final Requirement

The final result should look and behave like a **real Hotel Management SaaS application**, not a simple HTML template.

Prioritize these modules for the most complete implementation:

1. Dashboard
2. Front Desk
3. Reservations
4. Reservation Calendar
5. Rooms
6. Guests
7. Check-in / Check-out
8. Housekeeping
9. Billing / Payments
10. Reports

The remaining modules should also have functional pages with realistic mock data and interactions.

Make the application visually polished, responsive, consistent, and suitable for demonstrating a hotel management business system in Vietnam.

**Important:** Keep everything frontend-only. The application must work without a backend, database, build system, or framework.
