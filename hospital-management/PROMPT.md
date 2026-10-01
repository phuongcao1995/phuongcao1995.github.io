Create a **modern, realistic Healthcare / Hospital Management System web application** for the Vietnamese market.

## 1. Technical Requirements

Build the application as a **static frontend prototype only**.

* Use **HTML5**
* Use **CSS3**
* Use **Vanilla JavaScript only**
* Do NOT use React, Angular, Vue, Next.js, or other frontend frameworks
* Do NOT use a backend
* Do NOT use a database
* Do NOT require an API
* Store demo data in JavaScript arrays/objects or LocalStorage
* The application must run directly in a browser
* The UI should be responsive for:

  * Desktop
  * Tablet
  * Mobile
* Use clean, modular, maintainable HTML/CSS/JS
* Separate files:

  * `index.html`
  * `css/style.css`
  * `js/app.js`
  * Additional JS/CSS files if needed

The application language should be **English**, but the system should be designed so it can realistically be used by Vietnamese hospitals and clinics.

---

# 2. Product Goal

Create a hospital/clinic management platform similar in concept to healthcare management systems used in Vietnam.

The system should support:

* Hospital administration
* Patient management
* Doctor management
* Appointment management
* Medical records
* Outpatient management
* Inpatient management
* Emergency management
* Prescription management
* Pharmacy
* Laboratory
* Medical imaging
* Billing
* Insurance
* Staff management
* Hospital departments
* Bed management
* Reports and dashboards

Use realistic Vietnamese healthcare workflows and terminology where appropriate.

For inspiration, consider the types of features commonly provided by Vietnamese healthcare platforms and hospital-management software such as:

* Vinmec-style hospital/clinic workflows
* Medpro-style appointment and healthcare services
* eHospital-style hospital information systems
* Clinic/hospital management systems commonly used by Vietnamese hospitals
* Patient booking, queue management, electronic medical records, laboratory, pharmacy, billing and insurance systems

Do not copy any company's branding, UI, logo, or proprietary design. Use them only as **functional inspiration**.

---

# 3. Main Layout

Create a professional hospital dashboard with:

### Left Sidebar

* Dashboard
* Patients
* Appointments
* Doctors
* Departments
* Medical Records
* Visits
* Admissions
* Emergency
* Laboratory
* Medical Imaging
* Pharmacy
* Prescriptions
* Billing
* Insurance
* Beds & Rooms
* Staff
* Reports
* Settings

The sidebar should:

* Be collapsible
* Highlight the active page
* Display icons
* Support responsive mobile navigation

### Top Header

Include:

* Global search
* Notifications
* Messages
* Current hospital/branch
* Language selector
* User profile
* Role indicator
* Logout

---

# 4. Dashboard

Create a realistic healthcare dashboard.

Display KPI cards:

* Total Patients
* Today's Appointments
* Waiting Patients
* Admitted Patients
* Available Beds
* Emergency Cases
* Pending Lab Tests
* Revenue Today

Add charts/visualizations using **CSS/HTML/Vanilla JavaScript only**.

Dashboard sections:

### Today's Appointments

Show:

* Patient
* Doctor
* Department
* Appointment time
* Status
* Type

Statuses:

* Scheduled
* Checked In
* Waiting
* In Consultation
* Completed
* Cancelled
* No Show

### Patient Queue

Show:

* Queue number
* Patient name
* Department
* Doctor
* Waiting time
* Status

### Hospital Statistics

Include charts for:

* Patient visits by day
* Patient visits by department
* Revenue
* Emergency cases
* Bed occupancy
* Appointment status

---

# 5. Patient Management

Create a complete patient management interface.

Patient list columns:

* Patient ID
* Full Name
* Gender
* Date of Birth
* Phone
* Nationality
* Insurance
* Last Visit
* Status
* Actions

Features:

* Search
* Filter
* Sort
* Pagination
* Add patient
* Edit patient
* View patient
* Delete/archive patient

Patient profile should contain:

### Personal Information

* Patient ID
* Full name
* Date of birth
* Gender
* Phone
* Email
* Address
* Emergency contact

### Medical Information

* Blood type
* Allergies
* Chronic conditions
* Previous surgeries
* Current medications
* Medical history

### Insurance

* Insurance provider
* Insurance number
* Valid from
* Valid until
* Coverage status

### Patient Timeline

Show:

* Previous visits
* Diagnoses
* Prescriptions
* Laboratory results
* Imaging
* Admissions
* Discharges

---

# 6. Doctor Management

Create a doctor management module.

Doctor list:

* Doctor ID
* Name
* Photo/avatar
* Specialty
* Department
* Experience
* Phone
* Email
* Status

Doctor profile:

* Personal information
* Medical specialty
* Qualifications
* Certifications
* Department
* Working schedule
* Consultation fee
* Assigned patients
* Today's appointments
* Performance statistics

Include:

* Add doctor
* Edit doctor
* View profile
* Schedule management
* Availability status

---

# 7. Departments

Create a hospital department module.

Example departments:

* Internal Medicine
* Cardiology
* Pediatrics
* Obstetrics & Gynecology
* Surgery
* Orthopedics
* Dermatology
* ENT
* Ophthalmology
* Neurology
* Oncology
* Emergency
* Radiology
* Laboratory
* Pharmacy
* Dentistry

Each department should display:

* Department name
* Head doctor
* Doctors
* Nurses
* Patients today
* Available rooms
* Available beds
* Contact information

---

# 8. Appointment Management

Create an appointment scheduling system.

Features:

* Calendar
* Daily schedule
* Weekly schedule
* Monthly schedule
* Create appointment
* Reschedule
* Cancel
* Check-in
* Mark as completed

Appointment fields:

* Patient
* Doctor
* Department
* Date
* Time
* Appointment type
* Reason for visit
* Status
* Notes

Appointment types:

* General Consultation
* Follow-up
* Specialist Consultation
* Health Check
* Vaccination
* Laboratory
* Imaging
* Surgery Consultation

---

# 9. Medical Records

Create an Electronic Medical Record-style interface.

Medical record should include:

* Patient information
* Chief complaint
* Symptoms
* Vital signs
* Medical history
* Physical examination
* Diagnosis
* Treatment plan
* Doctor notes
* Prescription
* Laboratory results
* Imaging results
* Follow-up date

Diagnosis fields:

* Diagnosis
* ICD-10 code
* Primary/secondary diagnosis
* Notes

Vital signs:

* Blood pressure
* Heart rate
* Temperature
* Respiratory rate
* SpO2
* Height
* Weight
* BMI

---

# 10. Outpatient Workflow

Implement a realistic outpatient workflow:

Patient registration
→ Appointment
→ Check-in
→ Queue
→ Doctor consultation
→ Diagnosis
→ Laboratory / Imaging if needed
→ Prescription
→ Payment
→ Complete visit

Make the workflow visually understandable.

---

# 11. Inpatient Management

Create an inpatient module.

Features:

* Admission
* Room assignment
* Bed assignment
* Doctor assignment
* Nursing notes
* Daily treatment
* Medication administration
* Laboratory orders
* Imaging orders
* Transfer
* Discharge

Display:

* Room
* Bed
* Patient
* Doctor
* Admission date
* Expected discharge
* Status

---

# 12. Bed & Room Management

Create a visual hospital bed management screen.

Display:

* Building
* Floor
* Department
* Room
* Bed

Bed statuses:

* Available
* Occupied
* Reserved
* Cleaning
* Maintenance

Use different visual states for beds.

Allow users to:

* Assign patient
* Transfer patient
* Release bed
* View patient information

---

# 13. Emergency Department

Create an emergency dashboard.

Display:

* Emergency patients
* Triage level
* Arrival time
* Waiting time
* Assigned doctor
* Assigned room
* Status

Triage levels:

* Critical
* Urgent
* Moderate
* Non-Urgent

Include a realistic emergency workflow:

Arrival
→ Triage
→ Initial assessment
→ Doctor
→ Tests
→ Treatment
→ Admission / Discharge / Transfer

---

# 14. Laboratory

Create a Laboratory Information-style module.

Features:

* Test orders
* Sample collection
* Processing
* Results
* Approval
* Print report

Example tests:

* CBC
* Blood glucose
* HbA1c
* Liver function
* Kidney function
* Lipid profile
* Urinalysis
* Electrolytes

Laboratory result screen should include:

* Test name
* Result
* Reference range
* Unit
* Flag
* Status

---

# 15. Medical Imaging

Create an imaging module.

Examples:

* X-Ray
* CT
* MRI
* Ultrasound
* Mammography

Workflow:

Order
→ Schedule
→ Perform
→ Radiologist review
→ Result
→ Report

Display:

* Patient
* Study
* Modality
* Doctor
* Date
* Status
* Result

---

# 16. Pharmacy

Create a pharmacy management module.

Features:

* Medicines
* Inventory
* Stock levels
* Expiration dates
* Suppliers
* Prescriptions
* Dispensing

Medicine fields:

* Medicine ID
* Name
* Generic name
* Category
* Unit
* Manufacturer
* Batch
* Expiration date
* Quantity
* Selling price

Highlight:

* Low stock
* Expiring soon
* Expired

---

# 17. Prescription Management

Create prescription screens.

Prescription information:

* Patient
* Doctor
* Diagnosis
* Medicine
* Dosage
* Frequency
* Duration
* Route
* Instructions

Example:

Paracetamol 500mg
→ 1 tablet
→ 3 times/day
→ After meals
→ 5 days

Allow:

* Add medicine
* Remove medicine
* Edit dosage
* Print prescription

---

# 18. Billing

Create a hospital billing module.

Include:

* Consultation
* Laboratory
* Imaging
* Medicine
* Room
* Procedures
* Surgery
* Other services

Invoice fields:

* Invoice ID
* Patient
* Date
* Services
* Quantity
* Unit price
* Discount
* Insurance coverage
* Patient payment
* Total

Payment statuses:

* Unpaid
* Partially Paid
* Paid
* Refunded

---

# 19. Vietnamese Health Insurance

Design the system so it can support Vietnamese health insurance workflows.

Include fields such as:

* Health insurance number
* Insurance provider
* Insurance validity
* Coverage percentage
* Referral information
* Co-payment
* Insurance-covered amount
* Patient-paid amount

Do not implement real government APIs. Use demo/mock data only.

---

# 20. Staff Management

Create staff management.

Staff types:

* Doctor
* Nurse
* Pharmacist
* Technician
* Receptionist
* Accountant
* Administrator

Features:

* Staff profile
* Department
* Position
* Work schedule
* Status
* Contact information

---

# 21. Reports

Create a reporting dashboard.

Reports:

* Patient statistics
* Appointment statistics
* Doctor performance
* Department performance
* Revenue
* Insurance
* Pharmacy inventory
* Laboratory workload
* Bed occupancy
* Emergency statistics

Provide:

* Date filters
* Department filters
* Doctor filters
* Export button UI
* Print button UI

The export functionality can be simulated because this is a static application.

---

# 22. Search & Filtering

Implement global search.

Users should be able to search:

* Patients
* Doctors
* Appointments
* Medical records
* Prescriptions
* Medicines
* Invoices

Implement:

* Search
* Filter
* Sort
* Pagination
* Status filters
* Date filters

---

# 23. Roles & Permissions

Create a simulated role-based interface.

Roles:

### Administrator

Full access.

### Doctor

* Patients
* Appointments
* Medical records
* Prescriptions
* Laboratory
* Imaging

### Nurse

* Patients
* Queue
* Vital signs
* Inpatient
* Nursing notes

### Pharmacist

* Pharmacy
* Prescriptions
* Inventory

### Receptionist

* Patients
* Appointments
* Check-in
* Billing

### Accountant

* Billing
* Payments
* Reports

The frontend should simulate permissions using JavaScript.

---

# 24. Notifications

Create a notification center.

Examples:

* New appointment
* Patient waiting
* Lab result available
* Prescription ready
* Low medicine stock
* Bed available
* Emergency alert
* Payment pending

---

# 25. UI/UX Requirements

Design the application as a **professional enterprise healthcare system**.

Style:

* Clean
* Modern
* Medical/healthcare-oriented
* Professional
* Minimal
* Easy to scan
* Suitable for hospital staff

Use:

* Cards
* Tables
* Badges
* Tabs
* Modals
* Dropdowns
* Forms
* Side panels
* Charts
* Timeline components
* Status indicators

Avoid an overly colorful or consumer-oriented design.

The application should feel like a **real hospital information system**, not a simple demo dashboard.

---

# 26. Demo Data

Create realistic mock data.

Use Vietnamese-style names and locations.

Examples:

Patients:

* Nguyen Van An
* Tran Thi Mai
* Le Minh Duc
* Pham Thi Huong

Doctors:

* Dr. Nguyen Minh Anh
* Dr. Tran Quang Huy
* Dr. Le Thu Ha

Hospitals/locations:

* Da Nang
* Ha Noi
* Ho Chi Minh City

Use realistic:

* Vietnamese phone numbers
* Vietnamese addresses
* Health insurance numbers (fake/demo only)
* Doctor specialties
* Medical records
* Medicines
* Hospital departments

Clearly treat all data as **demo data**.

---

# 27. Important Healthcare Safety Requirement

This is a **software UI prototype only**.

Do not present the application as a real medical diagnosis system.

Do not generate real patient information.

Do not provide medical advice.

Use fictional/demo patient data.

Add an appropriate disclaimer in the application footer:

"Demo system — All patient, medical, financial and insurance data shown are fictional."

---

# 28. Interactions

Although there is no backend, make the application feel functional.

Implement with JavaScript:

* Navigation
* Sidebar collapse
* Modal dialogs
* Add/edit forms
* Search
* Filtering
* Sorting
* Pagination
* Tabs
* Calendar interactions
* Patient selection
* Appointment creation
* Status changes
* Notifications
* Toast messages
* LocalStorage persistence
* Dark/light mode if appropriate

Example:

Click **"Add Patient"**
→ Open modal
→ Fill patient information
→ Save
→ Add patient to patient table
→ Update dashboard statistics
→ Show success notification

---

# 29. Responsive Design

Desktop:

* Sidebar + main content
* Large data tables
* Dashboard cards

Tablet:

* Collapsible sidebar
* Responsive tables

Mobile:

* Bottom/slide-out navigation
* Stacked cards
* Mobile-friendly forms
* Horizontally scrollable tables where necessary

---

# 30. Final Quality Requirements

The final result should look like a **real-world hospital management product**, not a basic HTML exercise.

Prioritize:

1. Realistic healthcare workflows
2. Professional UI
3. Good information architecture
4. Usability
5. Responsive design
6. Consistent components
7. Realistic Vietnamese healthcare scenarios
8. Clean JavaScript architecture
9. Reusable UI components
10. Good demo data

Before finishing, test every major interaction and make sure there are no broken buttons, dead links, console errors, or non-functional navigation items.

The application should be immediately runnable by opening `index.html` in a modern browser.
