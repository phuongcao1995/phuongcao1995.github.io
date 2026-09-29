# NovaMart – Mua sắm thông minh, giá tốt mỗi ngày

Static e-commerce demo built with HTML5, CSS3 and vanilla JavaScript. No backend, no frameworks.

## Run
Open `index.html` in any modern browser. Everything runs from `file://`; all data is mock data in `js/data.js`, and state lives in `localStorage` (keys prefixed `nm_`).

Reset everything from the account menu → "Đặt lại dữ liệu demo".

## Structure
- `index.html` home · `products.html` search/listing · `product-detail.html?id=p001` · `cart.html` · `checkout.html` · `orders.html` · `account.html`
- `css/style.css` tokens + layout · `css/components.css` UI components · `css/responsive.css` breakpoints (1280 / 1024 / 768 / 480)
- `js/utils.js` helpers, toasts, modals, SVG product images, countdown
- `js/data.js` 53 products, 15 categories, flash sale, vouchers, user, notifications, reviews
- `js/search.js` accent-insensitive search + suggestions · `js/filters.js` filters & sorting
- `js/products.js` cards, home sections, product detail · `js/cart.js` cart & pricing rules
- `js/wishlist.js` wishlist + recently viewed · `js/checkout.js` vouchers, orders store, checkout
- `js/orders.js` order history & tracking · `js/account.js` account centre
- `js/notifications.js` notification dropdown · `js/app.js` shell, global events, page router

## Pricing rules (demo)
- Standard delivery ₫30K, free when every item has Freeship or subtotal ≥ ₫500K. Fast ₫50K, same-day ₫80K.
- Flash-sale price applies automatically during the sale (3-hour rolling slots).
- Vouchers: NOVA50K, NOVA100K, GIAM10, FREESHIP, MALL300K, NEWBIE15 (collect on the home page or type the code at checkout).

## Test card
Any 16 digits, a future MM/YY and a 3-digit CVV, e.g. `4111 1111 1111 1111`, `12/29`, `123`. Payment is simulated.

Product images are generated SVG illustrations (no external image hosts). The Be Vietnam Pro font loads from Google Fonts and falls back to system fonts offline.
