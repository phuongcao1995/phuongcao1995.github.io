# e-Gov Administration (demo)

A front-end demo of a Vietnamese digital government administration platform, built with **HTML, CSS and vanilla JavaScript only**: no frameworks, no build step, no server.

All people, companies, ID numbers, plates, parcels and documents are **fictional**, generated for demonstration. The design uses generic government styling and is not affiliated with any real portal or agency.

## Running it

Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari). Double-clicking the file works; no web server is needed.

Data is saved in your browser's `localStorage`, so changes persist between visits. To start over, use **Reset demo data** in the user menu or in System settings > Data.

The fonts (Be Vietnam Pro, Tinos) load from Google Fonts. Without internet access the app falls back to system fonts and still works.

## Demo accounts

Every account uses the password **`Demo@2026`**. The login page also has one-click buttons for each role, and you can switch roles at any time from the role selector in the top bar.

| Username | Role | What they see |
|---|---|---|
| `admin` | System Administrator | Every module, user and role management, data tools |
| `officer` | Government Officer | Citizens, services, vehicles, documents, procedures, complaints, reports |
| `manager` | Department Manager | Approves applications, signs documents, manages procedures and users (view) |
| `psofficer` | Public Service Officer | One-stop desk: receives applications, citizens, e-ID, complaints |
| `tax` | Tax Officer | Tax administration and business registration |
| `land` | Land Management Officer | Land register, cadastral map, transfers |
| `insurance` | Social Insurance Officer | Participants, benefit claims, contributions |
| `citizen` | Citizen (Nguyễn Minh Khoa) | Own applications, appointments, feedback and e-ID account |
| `business` | Business User | Own enterprise, tax account, applications |

Citizen and Business User roles only see their own records.

## Things to try

- **Full application workflow:** sign in as `citizen`, submit a new application ("Use sample file" attaches documents). Switch to `psofficer` to receive it and forward it for approval, then to `manager` to approve and complete it. The citizen gets a notification at each step.
- **Additional information request:** as `citizen`, open the birth registration marked *Additional Information Required* and provide the missing document.
- **Digital signature:** as `manager`, open an outgoing document that is *Awaiting signature* and sign it (any 6-digit passcode). The preview shows the signature stamp.
- **Land map:** as `land`, click parcels on the cadastral map, register a transfer or a mortgage.
- **Language and address model:** switch EN/VI in the top bar. In System settings, choose the 2-level address model to hide districts.

## Modules

Dashboard (10 KPIs, 5 charts), Citizens, Public services (applications, catalog, appointments), Administrative procedures, Digital identity, Public complaints, Tax, Social insurance, Land, Vehicles, Business registration, Electronic documents, Reports & statistics, Users & roles, System settings.

## Project structure

```
index.html
css/styles.css             Design system and responsive layout
js/core/i18n.js            Translation: GA.t('English text'), Vietnamese dictionary
js/core/utils.js           Icons, formatting (dd/mm/yyyy, 1.250.000 ₫), dates, CSV
js/core/store.js           localStorage persistence, audit log, notifications, session
js/data/mock-data.js       Seeded generator for all demo records
js/core/components.js      Tables, modals, forms and validation, tabs, SVG charts
js/modules/*.js            One file per module
js/app.js                  Roles, login, layout, global search, notifications, router
```

Scripts are plain `<script>` tags sharing one global namespace (`window.GA`), because ES modules are blocked when a page is opened from `file://`. Pages use hash routes such as `#/citizens/CT-0001`.

To translate more of the interface, add entries to the `vi` dictionary in `js/core/i18n.js`. Any phrase without a translation falls back to English.

## Notes on accuracy

- **Administrative levels:** the brief asked for province, district and ward addresses, and that is the default. Viet Nam abolished the district level on 1 July 2025 and merged many provinces (for example, Quảng Nam merged into Đà Nẵng). The demo keeps the pre-reform names as sample data; choose the 2-level address model in System settings to reflect the current structure.
- **Formats** (12-digit citizen ID, 10-digit enterprise and tax code, plate formats, application codes, document numbering and the official document layout) follow real conventions, but every value is invented.
- **Permissions** are enforced in the interface only. A production system must enforce them on a server, and would integrate VNeID and government single sign-on instead of the demo login.
