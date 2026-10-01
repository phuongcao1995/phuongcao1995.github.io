Create a modern, realistic **static web application called “FinBank”** — a Banking / FinTech platform inspired by real-world banking applications commonly used in **Vietnam**.

### Technology Requirements

* Use **HTML5, CSS3, and vanilla JavaScript only**
* No React, Angular, Vue, TypeScript, backend, database, or server-side code
* The application must run directly in a browser
* Use mock/static data and JavaScript to simulate interactions
* Responsive design for desktop, tablet, and mobile
* Use a clean, professional banking UI suitable for a Vietnamese financial institution
* UI language: **English**, but design the system so it could realistically be used by Vietnamese customers
* Use realistic Vietnamese data formats such as VND currency, Vietnamese names, phone numbers, bank accounts, and transaction descriptions
* Do not use real customer information or real banking credentials

### Design Inspiration

Take inspiration from the features and general UX patterns of Vietnamese banking and FinTech applications such as:

* Vietcombank
* BIDV
* Techcombank
* MB Bank
* VPBank
* ACB
* TPBank
* MoMo
* ZaloPay

Do not copy their branding, logos, or exact UI. Instead, combine common patterns into an original **FinBank** design.

---

## 1. Authentication

Create a realistic authentication experience:

* Login
* Register
* Forgot Password
* OTP verification UI
* Remember Me
* Logout
* Session timeout simulation
* Login error states
* Account locked/security warning UI
* Biometric login concept
* 2FA/security settings

For the static demo, simulate authentication with JavaScript rather than implementing a real backend.

---

## 2. Customer Dashboard

Create a comprehensive banking dashboard containing:

### Account Summary

* Total Balance
* Available Balance
* Savings Balance
* Credit Card Balance
* Loan Balance
* Recent transactions
* Monthly income
* Monthly expenses
* Spending summary

### Quick Actions

* Transfer Money
* Pay Bills
* Deposit
* Withdraw
* Top Up
* Scan QR
* Send Money
* Open Savings Account
* Apply for Loan

### Financial Overview

Include charts for:

* Income vs Expenses
* Monthly spending
* Spending by category
* Account balance history
* Savings progress

---

## 3. Bank Accounts

Create an **Accounts** module.

Support different account types:

* Current Account
* Savings Account
* Salary Account
* Business Account

For each account show:

* Account number
* Account name
* Available balance
* Current balance
* Account status
* Recent transactions
* Account details
* Transaction history
* Download statement
* Filter transactions
* Search transactions

Use masked account numbers such as:

`**** **** 1234`

---

## 4. Money Transfer

Create a realistic money-transfer workflow.

### Transfer Types

* Transfer between FinBank accounts
* Transfer to another bank
* Transfer to saved beneficiaries
* International transfer UI

### Features

* Select recipient
* Enter bank
* Enter account number
* Verify recipient
* Enter amount
* Transfer note
* Schedule transfer
* Save beneficiary
* Review transaction
* OTP confirmation
* Success/failure result

Include realistic Vietnamese banks such as:

* Vietcombank
* BIDV
* VietinBank
* Agribank
* Techcombank
* MB Bank
* VPBank
* ACB
* TPBank

Use mock data only.

---

## 5. QR Payment

Create a **QR Payment** feature inspired by Vietnamese QR-payment experiences.

Include:

* Scan QR UI
* Generate payment QR
* QR payment confirmation
* Merchant information
* Payment amount
* Payment note
* Payment success screen
* Transaction receipt

Simulate QR scanning using a mock interface instead of requiring a real camera.

---

## 6. Bill Payments

Create a **Bill Payment** module.

Support:

* Electricity
* Water
* Internet
* Mobile phone
* Postpaid mobile
* Television
* Insurance
* Tuition
* Tax
* Other services

Features:

* Select provider
* Enter customer ID
* Retrieve mock bill
* View bill details
* Pay bill
* Save biller
* Auto-pay concept
* Payment receipt
* Payment history

Use Vietnamese-style providers and realistic VND amounts.

---

## 7. Mobile Top-Up

Create a mobile top-up feature:

* Viettel
* Vinaphone
* Mobifone

Features:

* Enter phone number
* Select amount
* Choose payment account
* Confirm
* OTP simulation
* Success receipt

Support common amounts such as:

`20,000 / 50,000 / 100,000 / 200,000 / 500,000 VND`

---

## 8. Savings & Deposits

Create a **Savings** module.

Include:

* Savings accounts
* Term deposits
* Interest rates
* Maturity date
* Estimated interest
* Deposit amount
* Deposit duration
* Early withdrawal information
* Renewal settings
* Savings goal

Example terms:

* 1 month
* 3 months
* 6 months
* 12 months
* 24 months

Create a savings calculator using JavaScript.

---

## 9. Loans & Credit

Create a **Loans** module.

Include:

* Personal Loan
* Home Loan
* Auto Loan
* Business Loan
* Credit Card

Features:

* Loan products
* Interest rate
* Loan amount
* Loan term
* Monthly payment calculator
* Loan application
* Application status
* Repayment schedule
* Outstanding balance
* Payment history

Create an interactive loan calculator.

---

## 10. Credit Cards

Create a **Credit Card** module.

Include:

* Card overview
* Available credit
* Credit limit
* Current balance
* Minimum payment
* Payment due date
* Recent transactions
* Card controls
* Freeze/unfreeze card
* Change PIN UI
* Online payment toggle
* International payment toggle

Use masked card numbers and mock data.

---

## 11. Personal Finance Management

Create a **Personal Finance** section.

Features:

* Expense tracking
* Income tracking
* Spending categories
* Monthly budget
* Savings goals
* Financial statistics
* Spending trends
* Budget alerts

Categories:

* Food
* Shopping
* Transportation
* Housing
* Entertainment
* Healthcare
* Education
* Bills
* Travel
* Other

Include interactive charts using JavaScript/CSS or a lightweight chart library only if necessary.

---

## 12. Transaction Management

Create a detailed transaction page.

Features:

* Transaction list
* Search
* Filter by date
* Filter by category
* Filter by transaction type
* Filter by account
* Sort by amount/date
* Transaction details
* Transaction receipt
* Export/download statement UI

Transaction statuses:

* Completed
* Pending
* Failed
* Cancelled

---

## 13. Notifications

Create a notification center.

Examples:

* Money received
* Transfer successful
* Bill payment reminder
* Credit card payment due
* Suspicious transaction alert
* Login notification
* Promotional notification
* Savings maturity reminder

Support:

* Read/unread
* Mark as read
* Delete
* Filter

---

## 14. Security Center

Create a realistic **Security & Privacy** section.

Include:

* Change password
* Change PIN
* Two-factor authentication
* Biometric authentication
* Trusted devices
* Login history
* Active sessions
* Transaction limits
* Card controls
* Security alerts
* Privacy settings

Create warning/confirmation dialogs for sensitive actions.

---

## 15. Customer Profile

Create a profile management page:

* Personal information
* Phone number
* Email
* Address
* Identification information UI
* Employment information
* Notification preferences
* Language preferences
* Security settings

Use placeholder/mock information only.

---

## 16. Customer Support

Create a **Help & Support** section.

Include:

* FAQ
* Contact support
* Live chat UI
* Support ticket
* Hotline information
* Branch/ATM locator UI
* Common banking questions

Create a simple simulated chatbot interface.

---

## 17. Branch & ATM Locator

Create a map-style interface using mock locations.

Display:

* Branches
* ATMs
* Opening hours
* Services
* Address
* Distance
* ATM availability

Do not require a real map API; create a realistic static/map-like interface.

---

## 18. Admin Dashboard

Create a separate **FinBank Admin Portal**.

Include:

### Dashboard

* Total customers
* Total deposits
* Total loans
* Daily transactions
* Revenue
* Failed transactions
* Fraud alerts

### Customer Management

* Customer list
* Customer details
* Account status
* KYC status
* Search/filter

### Transaction Management

* Transaction monitoring
* Pending transactions
* Failed transactions
* Suspicious transactions

### Product Management

* Savings products
* Loan products
* Credit cards
* Fees
* Interest rates

### Reports

* Transaction reports
* Customer reports
* Revenue reports
* Loan reports
* Deposit reports

---

## 19. FinTech Features

Add several modern FinTech features to make the project more impressive:

* AI-powered financial insights
* Smart spending recommendations
* Personalized product recommendations
* Fraud detection alert UI
* Spending prediction
* Financial health score
* Automatic expense categorization
* Savings goal recommendations
* Personalized dashboard
* Smart notification center

These should be simulated using static/mock data.

---

## 20. Vietnamese Banking Context

Make the application feel realistic for Vietnam.

Use:

* VND currency formatting
* Vietnamese names
* Vietnamese banks
* Vietnamese mobile carriers
* Electricity/water/internet bill examples
* Vietnamese-style phone numbers
* Vietnamese addresses
* Vietnam time/date formatting
* Local transfer scenarios
* QR payment scenarios
* Common Vietnamese financial terminology where appropriate

Example:

`125,500,000 VND`

rather than:

`$125,500`

---

## 21. UI/UX Requirements

Create a polished banking experience.

### Desktop

Use:

* Left sidebar navigation
* Top navigation bar
* Dashboard cards
* Charts
* Tables
* Notifications
* User profile menu

### Mobile

Use:

* Bottom navigation
* Responsive cards
* Mobile-friendly transaction lists
* Mobile transfer workflow
* Mobile QR payment interface

Use:

* Consistent spacing
* Professional typography
* Clear hierarchy
* Accessible contrast
* Loading states
* Empty states
* Error states
* Success states
* Confirmation dialogs
* Toast notifications
* Skeleton loading where appropriate

---

## 22. JavaScript Interactions

Although this is a static application, make it feel like a real banking system.

Implement with JavaScript:

* Navigation
* Login/logout simulation
* Modal dialogs
* Form validation
* Transfer workflow
* OTP simulation
* QR payment simulation
* Bill payment
* Top-up
* Savings calculator
* Loan calculator
* Search
* Filtering
* Sorting
* Pagination
* Notifications
* Theme switching
* Profile editing
* Transaction status changes
* Toast messages
* Confirmation dialogs

Use mock JSON data stored in JavaScript or localStorage.

---

## 23. Suggested Project Structure

Create a maintainable structure such as:

```text
finbank/
├── index.html
├── dashboard.html
├── accounts.html
├── transfers.html
├── payments.html
├── savings.html
├── loans.html
├── cards.html
├── transactions.html
├── finance.html
├── notifications.html
├── profile.html
├── support.html
├── admin.html
│
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── components.css
│
├── js/
│   ├── app.js
│   ├── data.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── transfers.js
│   ├── payments.js
│   ├── savings.js
│   ├── loans.js
│   └── transactions.js
│
└── assets/
    └── images/
```

---

## 24. Demo Data

Populate the application with realistic mock data so every screen looks populated.

Example customer:

**Nguyen Minh Anh**

* Current Account: `**** **** 4821`
* Balance: `85,250,000 VND`
* Savings: `120,000,000 VND`
* Credit Card: `**** **** 9134`
* Credit Limit: `50,000,000 VND`

Create at least:

* 20 transactions
* 5 beneficiaries
* 5 billers
* 5 savings products
* 5 loan products
* 5 notifications
* Multiple spending categories

---

## 25. Important Constraints

This is a **frontend portfolio/demo project**, not a real banking system.

Therefore:

* Do not implement real payment processing
* Do not store real passwords
* Do not request real banking credentials
* Do not connect to real bank APIs
* Do not use real customer data
* Clearly use mock/demo data
* Simulate sensitive operations such as OTP and authentication

### Final Goal

The final result should look like a **production-quality Vietnamese digital banking platform**, similar in feature breadth to a combination of modern Vietnamese banking and FinTech applications, while remaining a **static HTML/CSS/JavaScript portfolio project**.

Prioritize **realistic UI/UX, complete user flows, responsive design, and interactive JavaScript behavior** over simply creating many separate pages.
