Create a modern **Vietnamese golf-course irrigation management web application**.

The application is a **static frontend prototype only**. It must use:

* HTML5
* CSS3
* Vanilla JavaScript
* No React, Angular, Vue, Bootstrap, Tailwind, or other frameworks
* No backend
* No database
* No API calls
* Use realistic mock/demo data stored in JavaScript
* All interactions should work locally in the browser

The design should feel like a professional **golf course irrigation control system**, similar to enterprise irrigation management software.

## 1. Language

The entire UI should be in **Vietnamese**.

Examples:

* Dashboard → Tổng quan
* Course → Sân golf
* Site → Khu vực
* Hole → Hố golf
* Satellite → Bộ điều khiển
* Decoder → Bộ giải mã
* Radio → Thiết bị Radio
* Irrigation Schedule → Lịch tưới
* Pump → Máy bơm
* Flow → Lưu lượng
* Sensor → Cảm biến
* Station → Trạm tưới
* Running → Đang chạy
* Completed → Hoàn thành
* Warning → Cảnh báo
* Error → Lỗi

Use realistic Vietnamese golf-course terminology rather than literal machine translation.

---

# 2. Overall Layout

Create a professional admin/dashboard layout with:

### Left Sidebar

Navigation:

* Tổng quan
* Sân & Khu vực

  * Courses
  * Sites
  * Holes
  * Areas
* Thiết bị hiện trường

  * Satellites
  * Decoders
  * Radios
  * Stations
* Lịch tưới
* Quản lý lưu lượng & máy bơm
* Cảm biến
* Chẩn đoán
* Báo cáo
* Cài đặt

The sidebar should support collapse/expand.

### Top Header

Include:

* Current golf course/site
* Search
* Notifications
* System status
* User profile
* Current date/time

Example:

"Riverside Golf Club"

"Trạng thái hệ thống: Bình thường"

---

# 3. Dashboard — Tổng quan

Create an attractive dashboard showing the current irrigation system status.

Display KPI cards:

* Tổng số Course
* Tổng số Site
* Tổng số Hole
* Tổng số Station
* Đang tưới
* Máy bơm đang chạy
* Lưu lượng hiện tại
* Cảnh báo

Example:

```
12 Courses
48 Sites
216 Holes
2,840 Stations

32 Stations đang tưới
3 Pumps đang chạy
1,245 GPM
5 Cảnh báo
```

Include:

### Irrigation Status

Show:

* Đang tưới
* Đã hoàn thành
* Đang chờ
* Lỗi

### Pump Status

Show each pump:

* Tên máy bơm
* Trạng thái
* Flow
* Pressure
* Speed
* Runtime

Example:

```
Pump 01
Đang chạy
Flow: 850 GPM
Pressure: 72 PSI
Speed: 68%
```

### Alerts

Show recent system alerts:

* Low flow
* High pressure
* Communication lost
* Decoder offline
* Pump warning
* Sensor warning

Use different visual severity levels.

---

# 4. Course & Site Structure

Create a management page for the golf course hierarchy.

Hierarchy:

```
Course
 ├── Site
 │    ├── Hole
 │    │    ├── Area
 │    │    │    ├── Station
 │    │    │    └── Sensor
```

Example:

```
Riverside Golf Club
 ├── North Course
 │    ├── Site 01
 │    │    ├── Hole 01
 │    │    ├── Hole 02
 │    │    └── Hole 03
 │    └── Site 02
 └── South Course
      ├── Site 03
      └── Site 04
```

Provide:

* Tree view
* Expand/collapse nodes
* Search
* Add Course
* Add Site
* Add Hole
* Edit
* Delete
* Details panel

When selecting an item, display:

* Name
* ID
* Status
* Location
* Number of stations
* Number of sensors
* Connected equipment

---

# 5. Field Equipment — Thiết bị hiện trường

Create an equipment management page.

Tabs:

### Satellites

Display:

* Satellite ID
* Name
* Site
* Status
* IP Address
* Communication
* Number of stations
* Last connection
* Firmware

Example statuses:

* Online
* Offline
* Warning

### Decoders

Display:

* Decoder ID
* Site
* Address
* Status
* Connected stations
* Last communication

### Radios

Display:

* Radio ID
* Type
* Site
* Signal strength
* Status
* Last communication

### Stations

Display:

* Station ID
* Hole
* Area
* Flow
* Runtime
* Status
* Current program

Add filtering:

* Course
* Site
* Hole
* Status
* Equipment type

---

# 6. Irrigation Scheduling — Lịch tưới

Create a complete irrigation scheduling interface.

Display:

### Calendar

Support:

* Day
* Week
* Month

Show irrigation programs on a timeline/calendar.

Example:

```
06:00  Hole 01 — Fairway
06:20  Hole 02 — Green
07:00  Hole 05 — Tee
08:00  Hole 08 — Fairway
```

Create irrigation programs containing:

* Program name
* Course
* Site
* Hole
* Area
* Stations
* Start time
* Duration
* Water volume
* Priority
* Status

Buttons:

* Tạo lịch tưới
* Chỉnh sửa
* Sao chép
* Kích hoạt
* Tạm dừng
* Xóa

Show a confirmation dialog before destructive actions.

---

# 7. Flow & Pump Management

Create a dedicated **Quản lý lưu lượng & Máy bơm** page.

### Pump Dashboard

Show:

* Pump status
* Current flow
* Target flow
* Pressure
* Pump speed
* Runtime
* Power
* Temperature

Create pump cards with visual status indicators.

### Flow Monitoring

Display a real-time-looking flow chart using mock data.

Show:

* Current Flow
* Target Flow
* Minimum Flow
* Maximum Flow

Example:

```
Current Flow: 1,245 GPM
Target Flow: 1,300 GPM
Pressure: 74 PSI
```

Use JavaScript to simulate changing values.

### Pump Controls

Provide UI controls:

* Start
* Stop
* Auto
* Manual
* Increase speed
* Decrease speed

These controls only modify frontend mock state.

Display confirmation dialogs for Start/Stop actions.

---

# 8. Sensors — Cảm biến

Create a sensor monitoring page.

Sensor types:

* Flow Sensor
* Pressure Sensor
* Soil Moisture
* Temperature
* Rain Sensor
* Water Level

Display:

* Sensor ID
* Type
* Location
* Current value
* Unit
* Status
* Last update

Example:

```
Soil Moisture
Hole 12
32.5%
Normal
```

Create charts for:

* Soil moisture
* Flow
* Pressure
* Temperature

Use mock historical data.

---

# 9. Diagnostics — Chẩn đoán

Create a diagnostic page for troubleshooting field equipment.

Display:

### Communication Status

```
Satellite 001     Online
Satellite 002     Online
Decoder 102       Warning
Radio 203         Offline
```

Include:

* Ping
* Last communication
* Signal strength
* Error code
* Error message
* Last successful communication

Add a "Chạy chẩn đoán" button that simulates diagnostic execution.

Show results such as:

```
Đang kiểm tra...
✓ Kết nối Satellite
✓ Kết nối Decoder
✓ Kiểm tra Radio
⚠ Radio 203 mất kết nối
```

---

# 10. Reports — Báo cáo

Create a reports page with:

* Water usage
* Irrigation runtime
* Pump performance
* Flow history
* Sensor history
* Equipment status
* Irrigation schedule history

Provide filters:

* Date range
* Course
* Site
* Hole
* Equipment

Display data in tables and charts.

---

# 11. Interactive Map

Create a simplified golf-course irrigation map.

It does not need a real GIS map.

Use a custom HTML/CSS visual representation of a golf course with:

* Holes
* Fairways
* Greens
* Stations
* Satellites
* Sensors
* Pipes

Use markers with different colors/statuses.

Example:

🟢 Online
🟡 Warning
🔴 Offline
🔵 Irrigating

Clicking a station should open a details panel.

---

# 12. Notifications

Create a notification dropdown.

Example:

```
⚠ Máy bơm P-02 có áp suất cao
5 phút trước

🔴 Radio R-203 mất kết nối
12 phút trước

💧 Lưu lượng Hole 12 thấp hơn mức dự kiến
20 phút trước

✓ Lịch tưới Program A đã hoàn thành
35 phút trước
```

---

# 13. Search & Filtering

Implement client-side search and filtering using JavaScript.

The user should be able to search:

* Courses
* Sites
* Holes
* Stations
* Satellites
* Decoders
* Sensors

Filtering should update tables/cards without reloading the page.

---

# 14. Mock Data

Create realistic mock data for:

* 3 Courses
* 6 Sites
* 18 Holes
* 100+ Stations
* 10 Satellites
* 20 Decoders
* 10 Radios
* 30 Sensors
* 5 Pumps
* Multiple irrigation schedules

Keep all data in JavaScript objects/arrays.

---

# 15. UI / UX Requirements

Design should be:

* Modern
* Professional
* Enterprise dashboard style
* Responsive
* Desktop-first
* Clean
* Easy to understand
* Suitable for golf-course irrigation operators

Use:

* Cards
* Tables
* Tabs
* Dropdowns
* Modal dialogs
* Status badges
* Tooltips
* Charts
* Progress bars
* Timeline
* Tree views

Use a consistent visual hierarchy.

Avoid making the UI look like a generic e-commerce website.

The application should look like a **real professional irrigation control platform**.

---

# 16. Technical Requirements

Use only:

```
index.html
style.css
script.js
```

Optional:

```
assets/
```

Do not use:

* React
* Angular
* Vue
* TypeScript
* Backend
* Database
* API
* npm
* Build tools

All functionality must work by opening `index.html` directly in a browser.

Use vanilla JavaScript for:

* Navigation
* Tabs
* Modals
* Dropdowns
* Filtering
* Searching
* Sorting
* Charts
* Mock real-time updates
* Status changes
* Notifications
* Form validation

Use CSS media queries for responsive behavior.

---

# 17. Demo / Simulation

Because this is a static prototype, simulate real-time irrigation data.

Every few seconds, update:

* Flow
* Pressure
* Pump speed
* Sensor values
* Station status
* Communication status

Add a small indicator:

```
● Live Demo
```

with:

```
Last updated: 14:32:18
```

---

# 18. Important UX Behavior

The prototype should feel like a real application rather than a collection of static pages.

For example:

1. User selects a Course.
2. Sites belonging to that Course are displayed.
3. User selects a Site.
4. Holes and equipment are filtered.
5. User selects a Hole.
6. Stations and sensors are displayed.
7. User selects a Station.
8. Station details appear.
9. User can start a simulated irrigation operation.
10. Dashboard values update automatically.

Use smooth transitions and visual feedback.

---

# 19. Final Goal

The final result should look like a **professional Vietnamese Golf Course Irrigation Management System**.

The main purpose is to demonstrate how a golf-course irrigation platform could manage:

**Course → Site → Hole → Area → Station → Irrigation Schedule → Pump → Flow → Sensor → Field Equipment**

Prioritize:

1. Clear information architecture
2. Professional dashboard design
3. Realistic irrigation terminology
4. Interactive mock functionality
5. Realistic sample data
6. Responsive UI
7. Easy navigation
8. Visual monitoring of irrigation status

Generate all required HTML, CSS, and JavaScript so the application can be opened directly in a browser and used as a fully interactive static prototype.
