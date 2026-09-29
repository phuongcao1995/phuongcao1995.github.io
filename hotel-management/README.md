# Sunrise HMS — Hotel Management System

A frontend-only hotel management system for **Sunrise Da Nang Hotel** (268 Vo Nguyen Giap Street, Son Tra, Da Nang).
Built with plain HTML5, CSS3 and vanilla JavaScript. No frameworks, no build step, no server.

## Run it
Unzip and double-click **`index.html`**. It works straight from the file system (`file://`) in Chrome, Edge, Firefox or Safari.
An internet connection is only used for the Be Vietnam Pro font; without it the app falls back to the system font.

## Demo accounts
| Username | Password | Role | Sees |
|---|---|---|---|
| `admin` | `admin123` | Administrator | Everything |
| `manager` | `manager123` | Front Office Manager | Everything except Settings |
| `reception` | `reception123` | Receptionist | Front office, billing, restaurant, services, customers, promotions |
| `housekeeping` | `house123` | Housekeeper | Dashboard, housekeeping, maintenance, rooms, inventory |

You can also click an account card on the login screen.

## Data
- 120 rooms on 8 floors, 7 room types (750,000 – 6,500,000 VND), 6 rate plans, ~270 guests,
  ~1,800 reservations from four weeks ago to five weeks ahead, folios, payments, invoices,
  restaurant orders, inventory, suppliers, promotions, staff and 12 months of financial history.
- Everything is saved in the browser's **localStorage**. Dates shift forward automatically, so the
  demo always has arrivals and departures "today".
- **Settings → System → Reset demo data** restores the sample data. **Export all data** downloads a JSON backup.

## Modules
Dashboard · Front Desk (arrivals, departures, in-house, room status board) · Reservations · Calendar
(drag-and-drop) · Rooms · Guests · Check-in wizard (8 steps) · Check-out settlement · Housekeeping ·
Maintenance · Services · Restaurant POS · Billing & VAT invoices · Payments (incl. VietQR) · Finance ·
Customers (corporate/agency/OTA) · Staff · Promotions · Inventory · Suppliers · Reports · Settings

## Business rules enforced
- No overlapping bookings for the same room; check-out must be after check-in; no past check-in dates.
- Occupied, maintenance, out-of-order and disabled rooms cannot be assigned.
- Check-in only into clean rooms (configurable). Nights = check-out − check-in; room charge = nights × rate.
- Folio: Total = Subtotal + VAT (10%) − Discount; Balance = Total − payments. City ledger bills companies.
- Check-out sets the room to **Dirty**; it becomes **Available** only after Cleaning → Clean → Inspected
  (inspection requirement is configurable). Finished maintenance also returns the room to Dirty.
- Promotion codes are validated for dates, room type, minimum nights and maximum discount.

## Keyboard shortcuts
`/` search · `N` new reservation · `C` calendar · `Esc` close dialog

## Structure
```
index.html
css/  style.css (tokens, layout) · components.css · dashboard.css (module screens, print) · responsive.css
js/   utils.js (helpers, UI kit, charts, icons) · storage.js · data.js (seed) · hotel.js (business rules)
      app.js (login, roles, router, top bar) · one file per module
```
Scripts are classic `<script>` tags sharing one namespace, `window.HMS`, so the app runs without a web server.
