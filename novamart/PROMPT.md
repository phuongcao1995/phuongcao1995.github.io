Create a modern **online shopping / e-commerce website** using only:

* HTML5
* CSS3
* Vanilla JavaScript
* No backend
* No database
* No frameworks
* No React, Vue, Angular, Bootstrap, or Tailwind
* All functionality must work with mock/static data in JavaScript

The website should be inspired by the overall experience of **Shopee, Lazada, and Tiki**, but must have its own original branding, layout, and visual identity. Do not copy their exact UI, logos, or assets.

## 1. Website Concept

Create a fictional Vietnamese e-commerce platform called:

**"NovaMart"**

Tagline:

**"Mua sắm thông minh – Giá tốt mỗi ngày"**

The website should feel like a real, production-quality Vietnamese shopping platform.

Target users:

* Vietnamese customers
* Mobile and desktop users
* Users looking for electronics, fashion, beauty, home appliances, groceries, and lifestyle products

---

## 2. Main Pages

Create the following pages/views:

### Home Page

Include:

* Top announcement bar
* Header

  * NovaMart logo
  * Search bar
  * Search button
  * Cart icon
  * Notification icon
  * User/account section
* Main navigation

  * Categories
  * Flash Sale
  * Best Sellers
  * New Arrivals
  * Vouchers
  * Mall
* Hero banner carousel
* Category shortcuts
* Flash Sale section
* Recommended products
* Best-selling products
* Promotional banners
* Featured brands
* Recently viewed products
* Footer

---

## 3. Product Categories

Create a category sidebar/grid with realistic Vietnamese categories:

* Điện thoại & Điện máy
* Laptop & Máy tính
* Thời trang nam
* Thời trang nữ
* Giày dép
* Mỹ phẩm & Làm đẹp
* Nhà cửa & Đời sống
* Mẹ & Bé
* Thực phẩm
* Sức khỏe
* Thể thao
* Phụ kiện
* Đồ gia dụng
* Sách
* Ô tô & Xe máy

Clicking a category should filter the product list.

---

## 4. Product Cards

Each product card should contain:

* Product image
* Product name
* Rating
* Number of reviews
* Sold count
* Current price
* Original price
* Discount percentage
* Free shipping badge
* Mall / official-store badge when applicable
* Favorite button
* Add-to-cart button

Example:

```text
Wireless Bluetooth Headphones
★★★★★ 4.8 | 1.2k reviews

₫599,000
₫999,000   -40%

Free Shipping
1.5k sold
```

Use realistic Vietnamese product names and VND prices.

---

## 5. Product Detail Page

When clicking a product, display:

* Large product image gallery
* Thumbnail images
* Product name
* Rating
* Reviews
* Sold quantity
* Price
* Original price
* Discount
* Flash-sale countdown
* Shipping information
* Product variations

  * Color
  * Size
  * Storage
  * Model
* Quantity selector
* Add to Cart
* Buy Now
* Favorite
* Share

Below the product:

### Product Information

* Description
* Specifications
* Warranty
* Shipping information

### Customer Reviews

Show:

* Overall rating
* Rating distribution
* Customer comments
* Customer photos
* Verified purchase badge

### Recommended Products

---

## 6. Shopping Cart

Create a functional shopping cart using JavaScript.

Features:

* Select/deselect products
* Select all
* Change quantity
* Remove product
* Product subtotal
* Shipping fee
* Discount
* Voucher
* Total amount
* Checkout button

Persist cart data using:

```javascript
localStorage
```

---

## 7. Checkout Page

Create a mock checkout experience.

Include:

### Shipping Address

Example:

```text
Nguyễn Văn A
0901 234 567
123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng
```

### Shipping Methods

* Standard Delivery
* Fast Delivery
* Same-day Delivery

### Payment Methods

* Cash on Delivery
* Bank Transfer
* Visa / Mastercard
* E-wallet

Use mock payment processing only. Do not connect to a real payment gateway.

Show:

* Products
* Subtotal
* Shipping
* Voucher discount
* Total
* Place Order button

After placing the order, display a successful order confirmation page.

---

## 8. Search

Implement functional product search using JavaScript.

Users should be able to search:

```text
iPhone
laptop
giày
tai nghe
áo sơ mi
máy giặt
```

Search should:

* Filter products dynamically
* Show number of results
* Support partial matching
* Display "Không tìm thấy sản phẩm" when there are no results

Add search suggestions while typing.

---

## 9. Product Filtering & Sorting

Implement:

### Filters

* Category
* Price range
* Rating
* Brand
* Discount
* Free shipping
* Mall

### Sorting

* Popular
* Best selling
* Price: Low → High
* Price: High → Low
* Highest rated
* Newest

All filtering and sorting should happen client-side using JavaScript.

---

## 10. Flash Sale

Create a visually attractive Flash Sale section.

Include:

* Countdown timer
* Discount percentage
* Products
* Sold progress bar
* Remaining quantity
* "Mua ngay" button

Example:

```text
🔥 FLASH SALE

02 : 35 : 41

Sony WH-1000XM5
₫5,990,000
₫8,990,000

████████░░ 82% sold
```

The countdown should work using JavaScript.

---

## 11. Vouchers

Create a voucher section with cards such as:

```text
GIẢM ₫50K
Đơn tối thiểu ₫299K

[Collect]
```

When the user clicks **Collect**, store the voucher in `localStorage`.

Allow the user to apply collected vouchers during checkout.

---

## 12. User Account

Create a mock user account interface.

Sections:

* Profile
* My Orders
* Pending Payment
* To Ship
* Shipping
* Completed
* Cancelled
* My Vouchers
* Wishlist
* Recently Viewed

No real authentication is required.

Use mock user data.

---

## 13. Order Tracking

Create an order tracking component:

```text
✓ Order Placed
      ↓
✓ Payment Confirmed
      ↓
✓ Preparing Shipment
      ↓
● Shipping
      ↓
○ Delivered
```

Allow users to view order details.

---

## 14. Wishlist

Implement a functional wishlist.

Users can:

* Add products
* Remove products
* View wishlist
* Move products to cart

Persist wishlist data using `localStorage`.

---

## 15. Recently Viewed

Track recently viewed products with:

```javascript
localStorage
```

Display the latest viewed products on the homepage.

---

## 16. Notifications

Create a notification dropdown.

Example notifications:

```text
🎉 Your order has been shipped.

🔥 Flash Sale starts in 10 minutes.

🎁 You received a ₫50K voucher.

📦 Your order has been delivered.
```

---

## 17. Responsive Design

The website must work well on:

### Desktop

* 1440px
* 1280px
* 1024px

### Tablet

* 768px

### Mobile

* 375px
* 390px
* 430px

On mobile:

* Convert navigation into a mobile menu
* Make search full-width
* Use responsive product grids
* Make cart accessible
* Use bottom navigation

Mobile bottom navigation:

```text
Home | Categories | Cart | Orders | Account
```

---

## 18. Visual Design

Create a modern e-commerce design.

Style characteristics:

* Clean
* Professional
* Fast
* Modern
* High visual hierarchy
* Rounded cards
* Subtle shadows
* Smooth hover animations
* Clear CTA buttons
* Good spacing
* Excellent typography

Use a distinctive NovaMart color palette rather than copying Shopee/Lazada/Tiki.

Suggested colors:

```text
Primary: #FF5A36
Secondary: #FF8A3D
Background: #F5F6F8
Text: #222222
Success: #16A34A
Danger: #EF4444
```

Use CSS variables so the theme can easily be changed.

---

## 19. Images

Use realistic product images.

If external image URLs are used, use reliable public image sources.

If external images are unavailable, provide attractive placeholder images using CSS or generated SVG placeholders.

Do not depend on images that require a backend.

---

## 20. JavaScript Architecture

Keep JavaScript organized into logical modules/functions.

Suggested structure:

```text
js/
├── data.js
├── app.js
├── products.js
├── cart.js
├── wishlist.js
├── checkout.js
├── search.js
├── filters.js
├── notifications.js
└── utils.js
```

Use clean, readable JavaScript.

Avoid putting the entire application into one huge JavaScript file.

---

## 21. Data

Create at least **40 realistic mock products**.

Each product should contain:

```javascript
{
    id,
    name,
    category,
    brand,
    price,
    originalPrice,
    discount,
    rating,
    reviewCount,
    sold,
    image,
    images,
    description,
    specifications,
    freeShipping,
    mall,
    stock
}
```

Include products from multiple categories.

---

## 22. UX Details

Add:

* Toast notifications
* Loading animations
* Empty states
* Hover effects
* Button animations
* Skeleton loading
* Smooth scrolling
* Image zoom on product detail
* Modal dialogs
* Confirmation dialogs
* Back-to-top button

Examples:

```text
✓ Added to cart
✓ Added to wishlist
✓ Voucher collected
✓ Order placed successfully
```

---

## 23. Performance

Keep the website lightweight.

Requirements:

* No unnecessary libraries
* Avoid excessive DOM manipulation
* Lazy-load product images
* Minimize duplicated JavaScript
* Use event delegation where appropriate
* Keep CSS organized
* Avoid unnecessary animations

---

## 24. Accessibility

Implement basic accessibility:

* Semantic HTML5
* Proper button labels
* `alt` attributes
* Keyboard navigation
* Visible focus states
* Good color contrast
* ARIA labels where appropriate

---

## 25. File Structure

Generate the complete project:

```text
novamart/
│
├── index.html
├── products.html
├── product-detail.html
├── cart.html
├── checkout.html
├── orders.html
├── account.html
│
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── components.css
│
├── js/
│   ├── data.js
│   ├── app.js
│   ├── products.js
│   ├── cart.js
│   ├── wishlist.js
│   ├── checkout.js
│   ├── search.js
│   ├── filters.js
│   ├── notifications.js
│   └── utils.js
│
└── assets/
    └── images/
```

---

## 26. Important Requirement

This must be a **fully functional static frontend demo**, not just a visual mockup.

The following must actually work with Vanilla JavaScript:

* Search
* Category filtering
* Sorting
* Product detail navigation
* Add to cart
* Remove from cart
* Change quantity
* Wishlist
* Recently viewed
* Voucher collection
* Voucher application
* Checkout
* Mock order creation
* Order history
* Flash-sale countdown
* Notifications
* Responsive navigation
* localStorage persistence

Do not create fake buttons that do nothing.

---

## 27. Final Quality Target

The final result should look like a **real modern Vietnamese e-commerce platform**, combining the useful UX patterns commonly found in Shopee, Lazada, and Tiki while maintaining an original NovaMart identity.

Prioritize:

**Visual quality → UX → Functionality → Responsive design → Clean code**

The website should be immediately runnable by opening `index.html` in a browser.
