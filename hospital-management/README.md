# MediPlus HIS — Hospital Management System

A frontend-only hospital/clinic management system for **MediPlus General Hospital** (Da Nang, with Ha Noi and
Ho Chi Minh City branches). Built with plain HTML5, CSS3 and vanilla JavaScript. No frameworks, no build step, no server.

## Run it
Unzip and double-click **`index.html`**, or serve the folder with any static file server. It works straight from
the file system (`file://`) in Chrome, Edge, Firefox or Safari. An internet connection is only used for the
Be Vietnam Pro font; without it the app falls back to the system font.

## Demo accounts
| Username | Password | Role | Sees |
|---|---|---|---|
| `admin` | `admin123` | Administrator | Everything |
| `doctor` | `doctor123` | Doctor | Patients, appointments, visits, medical records, admissions, emergency, laboratory, imaging, prescriptions |
| `nurse` | `nurse123` | Nurse | Patients, visits/queue, admissions, beds, emergency |
| `pharmacist` | `pharma123` | Pharmacist | Pharmacy, prescriptions |
| `reception` | `reception123` | Receptionist | Patients, appointments, visits/check-in, billing |
| `accountant` | `account123` | Accountant | Billing, insurance, reports |

You can also click an account card on the login screen.

## Data
- 16 departments, ~26 doctors, ~35 support staff, 150 patients, ~90 beds across 8 inpatient wards,
  appointments and encounters from three weeks ago to two weeks ahead (with full electronic medical
  records, lab and imaging orders, prescriptions and invoices for completed visits), plus live emergency
  cases, pharmacy inventory and admissions.
- Everything is saved in the browser's **localStorage**. Dates shift forward automatically, so the demo
  always has activity "today". **Settings → System → Reset demo data** restores the sample data.
  **Export all data** downloads a JSON backup.
- All patient, medical, financial and insurance data shown are **fictional**. This is a UI prototype only —
  it is not a real medical record system and provides no medical advice.

## Modules
Dashboard · Patients (profile, medical info, insurance, timeline) · Appointments (list + calendar) ·
Doctors · Departments · Visits (live outpatient queue: waiting → consultation → labs/imaging → billing →
completed) · Medical Records (EMR repository, printable) · Admissions (nursing notes, daily treatment,
medication administration, transfer, discharge) · Beds & Rooms (visual board) · Emergency (triage board) ·
Laboratory (orders, collection, results, approval) · Medical Imaging (order, schedule, report) · Pharmacy
(inventory, stock, expiry) · Prescriptions (create, dispense) · Billing (invoices, payments, refunds,
printable) · Insurance (BHYT-style coverage and claims) · Staff · Reports (10 report sections with charts,
date filters and CSV export) · Settings

## Business rules enforced
- No double-booking a doctor for the same date and time slot.
- The outpatient queue only moves forward through Waiting → In Consultation → Labs/Imaging → Billing →
  Completed (or Cancelled from Waiting); completing a visit auto-generates its invoice if none exists yet.
- A bed can only be assigned to a patient when it is Available; discharging a patient releases the bed to
  Cleaning, not directly back to Available.
- A prescription can only be dispensed if every medicine has enough stock on hand; dispensing decrements
  inventory.
- Invoice total = Subtotal − Insurance covered (based on the patient's active BHYT/private coverage %) −
  Discount = Patient payable; Balance = Patient payable − payments recorded.

## Keyboard shortcuts
`/` search · `N` new appointment · `Q` open outpatient queue · `Esc` close dialog

## Structure
```
index.html
css/  style.css (tokens, layout) · components.css (shared UI kit) · dashboard.css (module screens, print) · responsive.css
js/   utils.js (helpers, UI kit, charts, icons) · storage.js · data.js (seed) · clinic.js (business rules)
      app.js (login, roles, router, top bar) · one file per module
```
Scripts are classic `<script>` tags sharing one namespace, `window.HIS`, so the app runs without a web server.
