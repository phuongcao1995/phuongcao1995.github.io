/* ==========================================================
   NovaMart – data.js
   All static mock data used by the demo.
   ========================================================== */
(function (NM) {
  'use strict';

  const CATEGORIES = [
    { id: 'dien-thoai', name: 'Điện thoại & Điện máy', icon: '📱', hue: 210 },
    { id: 'laptop', name: 'Laptop & Máy tính', icon: '💻', hue: 230 },
    { id: 'thoi-trang-nam', name: 'Thời trang nam', icon: '👔', hue: 200 },
    { id: 'thoi-trang-nu', name: 'Thời trang nữ', icon: '👗', hue: 330 },
    { id: 'giay-dep', name: 'Giày dép', icon: '👟', hue: 25 },
    { id: 'my-pham', name: 'Mỹ phẩm & Làm đẹp', icon: '💄', hue: 345 },
    { id: 'nha-cua', name: 'Nhà cửa & Đời sống', icon: '🛋️', hue: 35 },
    { id: 'me-be', name: 'Mẹ & Bé', icon: '🍼', hue: 190 },
    { id: 'thuc-pham', name: 'Thực phẩm', icon: '🥫', hue: 95 },
    { id: 'suc-khoe', name: 'Sức khỏe', icon: '💊', hue: 160 },
    { id: 'the-thao', name: 'Thể thao', icon: '🏸', hue: 140 },
    { id: 'phu-kien', name: 'Phụ kiện', icon: '🎧', hue: 265 },
    { id: 'gia-dung', name: 'Đồ gia dụng', icon: '🍳', hue: 15 },
    { id: 'sach', name: 'Sách', icon: '📚', hue: 45 },
    { id: 'o-to-xe-may', name: 'Ô tô & Xe máy', icon: '🏍️', hue: 0 }
  ];
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  /* ---------- Product factory ---------- */
  let seq = 0;
  const P = (name, category, brand, price, originalPrice, rating, reviewCount, sold, emoji, extra = {}) => {
    seq += 1;
    const cat = catById[category];
    const hue = extra.hue != null ? extra.hue : cat.hue;
    const images = [0, 1, 2, 3].map((v) => NM.productSVG(emoji, hue, brand, v));
    const discount = Math.round((1 - price / originalPrice) * 100);
    const specs = Object.assign({ 'Thương hiệu': brand, 'Xuất xứ thương hiệu': extra.origin || 'Việt Nam' }, extra.specs || {});
    return {
      id: 'p' + String(seq).padStart(3, '0'),
      name, category, brand, price, originalPrice, discount, rating, reviewCount, sold,
      image: images[0], images, emoji, hue,
      description: extra.desc || '',
      highlights: extra.highlights || [],
      specifications: specs,
      variants: extra.variants || {},
      freeShipping: extra.freeShipping !== false,
      mall: !!extra.mall,
      stock: extra.stock || 50 + ((seq * 37) % 300),
      warranty: extra.warranty || 'Đổi trả miễn phí trong 15 ngày nếu sản phẩm lỗi do nhà sản xuất.',
      addedAt: Date.now() - ((seq * 53) % 90) * 86400000,
      tags: extra.tags || []
    };
  };

  const PRODUCTS = [
    // Điện thoại & Điện máy
    P('iPhone 15 Pro Max 256GB – Chính hãng VN/A', 'dien-thoai', 'Apple', 29990000, 34990000, 4.9, 3240, 12800, '📱', {
      mall: true, origin: 'Mỹ', warranty: 'Bảo hành chính hãng 12 tháng tại trung tâm Apple ủy quyền.',
      desc: 'Khung titan cấp hàng không vũ trụ, chip A17 Pro và hệ thống camera 48MP với zoom quang học 5x.',
      highlights: ['Chip A17 Pro 3nm', 'Camera Tetraprism zoom 5x', 'Cổng USB-C tốc độ USB 3', 'Nút Tác vụ tùy chỉnh'],
      specs: { 'Màn hình': '6.7 inch Super Retina XDR, 120Hz', 'Chip': 'A17 Pro', 'RAM': '8GB', 'Pin': '4.441 mAh' },
      variants: { 'Màu sắc': ['Titan tự nhiên', 'Titan xanh', 'Titan trắng', 'Titan đen'], 'Dung lượng': ['256GB', '512GB', '1TB'] },
      tags: ['iphone', 'dien thoai', 'smartphone']
    }),
    P('Samsung Galaxy S24 Ultra 12GB/256GB', 'dien-thoai', 'Samsung', 26490000, 33990000, 4.8, 2150, 8600, '📱', {
      mall: true, origin: 'Hàn Quốc', hue: 250,
      desc: 'Galaxy AI thông minh, bút S Pen tích hợp và camera 200MP cho ảnh sắc nét đến từng chi tiết.',
      highlights: ['Galaxy AI dịch cuộc gọi trực tiếp', 'Camera 200MP', 'Khung Titanium', 'Bút S Pen tích hợp'],
      specs: { 'Màn hình': '6.8 inch Dynamic AMOLED 2X', 'Chip': 'Snapdragon 8 Gen 3 for Galaxy', 'RAM': '12GB', 'Pin': '5.000 mAh' },
      variants: { 'Màu sắc': ['Xám Titan', 'Đen Titan', 'Tím Titan'], 'Dung lượng': ['256GB', '512GB'] },
      tags: ['samsung', 'dien thoai']
    }),
    P('Xiaomi Redmi Note 13 Pro 8GB/256GB', 'dien-thoai', 'Xiaomi', 6290000, 7490000, 4.7, 1890, 15400, '📲', {
      origin: 'Trung Quốc', desc: 'Camera 200MP, màn hình AMOLED 120Hz và sạc nhanh 67W trong tầm giá phổ thông.',
      highlights: ['Camera chính 200MP', 'Sạc nhanh 67W', 'Màn AMOLED 1.5K'],
      specs: { 'Màn hình': '6.67 inch AMOLED 120Hz', 'Chip': 'Helio G99-Ultra', 'Pin': '5.000 mAh' },
      variants: { 'Màu sắc': ['Đen', 'Tím', 'Xanh lá'], 'Dung lượng': ['128GB', '256GB'] }, tags: ['dien thoai']
    }),
    P('OPPO Reno11 F 5G 8GB/256GB', 'dien-thoai', 'OPPO', 7990000, 8990000, 4.6, 980, 5200, '📲', {
      mall: true, hue: 170, origin: 'Trung Quốc', desc: 'Thiết kế mỏng nhẹ, camera chân dung 64MP và kháng nước IP65.',
      specs: { 'Màn hình': '6.7 inch AMOLED', 'Pin': '5.000 mAh', 'Sạc': '67W SUPERVOOC' },
      variants: { 'Màu sắc': ['Xanh biển', 'Tím hoa cà'] }, tags: ['dien thoai']
    }),
    P('Máy giặt LG Inverter 10kg FV1410S4P', 'dien-thoai', 'LG', 8490000, 11990000, 4.8, 760, 2300, '🫧', {
      mall: true, origin: 'Hàn Quốc', warranty: 'Bảo hành động cơ 10 năm, linh kiện 2 năm.',
      desc: 'Công nghệ AI DD nhận diện chất liệu vải, giặt hơi nước Steam diệt 99,9% vi khuẩn.',
      highlights: ['AI DD bảo vệ sợi vải', 'Giặt hơi nước Steam', 'Tiết kiệm điện Inverter'],
      specs: { 'Khối lượng giặt': '10 kg', 'Loại máy': 'Cửa trước', 'Tốc độ vắt': '1.400 vòng/phút' },
      tags: ['may giat', 'dien may']
    }),
    P('Tủ lạnh Samsung Inverter 236 lít RT22M4032BY', 'dien-thoai', 'Samsung', 5690000, 7290000, 4.7, 540, 1800, '🧊', {
      mall: true, origin: 'Hàn Quốc', desc: 'Làm lạnh vòm, ngăn đông mềm và tiết kiệm điện với Digital Inverter.',
      specs: { 'Dung tích': '236 lít', 'Kiểu tủ': 'Ngăn đá trên', 'Công nghệ': 'Digital Inverter' }, tags: ['tu lanh', 'dien may']
    }),
    // Laptop
    P('MacBook Air M3 13 inch 8GB/256GB', 'laptop', 'Apple', 26990000, 31990000, 4.9, 1320, 4100, '💻', {
      mall: true, origin: 'Mỹ', warranty: 'Bảo hành chính hãng 12 tháng.',
      desc: 'Mỏng nhẹ 1,24kg, chip M3 mạnh mẽ và thời lượng pin lên đến 18 giờ.',
      highlights: ['Chip Apple M3', 'Pin đến 18 giờ', 'Màn Liquid Retina 13.6 inch'],
      specs: { 'CPU': 'Apple M3 8 nhân', 'RAM': '8GB', 'SSD': '256GB', 'Trọng lượng': '1,24 kg' },
      variants: { 'Màu sắc': ['Đêm xanh thẳm', 'Bạc', 'Xám không gian', 'Ánh sao'], 'Cấu hình': ['8GB/256GB', '16GB/512GB'] },
      tags: ['laptop', 'macbook', 'may tinh']
    }),
    P('Laptop ASUS Vivobook 15 OLED i5-13500H', 'laptop', 'ASUS', 15490000, 18990000, 4.7, 870, 3200, '💻', {
      hue: 200, origin: 'Đài Loan', desc: 'Màn hình OLED 15.6 inch rực rỡ, chuẩn màu 100% DCI-P3 cho học tập và sáng tạo.',
      specs: { 'CPU': 'Intel Core i5-13500H', 'RAM': '16GB', 'SSD': '512GB', 'Màn hình': '15.6 inch OLED FHD' },
      variants: { 'Màu sắc': ['Bạc', 'Xanh đen'] }, tags: ['laptop', 'may tinh']
    }),
    P('Laptop Dell Inspiron 14 5440 i7 16GB', 'laptop', 'Dell', 17990000, 20490000, 4.6, 420, 1500, '💻', {
      mall: true, origin: 'Mỹ', hue: 215, desc: 'Vỏ nhôm bền bỉ, bàn phím êm và webcam FHD cho làm việc từ xa.',
      specs: { 'CPU': 'Intel Core i7-150U', 'RAM': '16GB', 'SSD': '512GB' }, tags: ['laptop', 'may tinh']
    }),
    P('Chuột không dây Logitech MX Master 3S', 'laptop', 'Logitech', 2190000, 2790000, 4.9, 2210, 9800, '🖱️', {
      mall: true, origin: 'Thụy Sĩ', desc: 'Cảm biến 8.000 DPI, click yên tĩnh và cuộn điện từ MagSpeed.',
      specs: { 'Kết nối': 'Bluetooth, Logi Bolt', 'DPI': '8.000', 'Pin': '70 ngày' },
      variants: { 'Màu sắc': ['Graphite', 'Xám nhạt'] }, tags: ['chuot', 'may tinh']
    }),
    P('Bàn phím cơ AKKO 3098B Multi-modes', 'laptop', 'AKKO', 1590000, 1990000, 4.8, 1150, 6400, '⌨️', {
      origin: 'Trung Quốc', freeShipping: false, desc: 'Kết nối 3 chế độ, hotswap, switch AKKO CS Jelly.',
      specs: { 'Layout': '98 phím', 'Kết nối': 'Bluetooth 5.0 / 2.4Ghz / Type-C' },
      variants: { 'Switch': ['Jelly Pink', 'Jelly White', 'Jelly Purple'] }, tags: ['ban phim']
    }),
    // Thời trang nam
    P('Áo sơ mi nam Oxford dài tay form regular', 'thoi-trang-nam', 'Routine', 299000, 450000, 4.7, 3420, 21500, '👔', {
      desc: 'Vải Oxford 100% cotton thoáng mát, đứng form, phù hợp đi làm lẫn đi chơi.',
      specs: { 'Chất liệu': '100% Cotton Oxford', 'Kiểu dáng': 'Regular fit' },
      variants: { 'Màu sắc': ['Trắng', 'Xanh nhạt', 'Hồng phấn'], 'Kích cỡ': ['S', 'M', 'L', 'XL'] }, tags: ['ao so mi', 'ao']
    }),
    P('Quần jean nam 511 slim fit co giãn', 'thoi-trang-nam', "Levi's", 890000, 1290000, 4.6, 1210, 5400, '👖', {
      mall: true, origin: 'Mỹ', hue: 220, desc: 'Dáng slim ôm vừa, vải denim co giãn nhẹ thoải mái cả ngày.',
      specs: { 'Chất liệu': '99% Cotton, 1% Elastane', 'Kiểu dáng': 'Slim fit' },
      variants: { 'Màu sắc': ['Xanh đậm', 'Xanh wash'], 'Kích cỡ': ['29', '30', '31', '32', '34'] }, tags: ['quan jean']
    }),
    P('Áo polo nam cotton Pique thoáng khí', 'thoi-trang-nam', 'Coolmate', 199000, 299000, 4.8, 5210, 32100, '👕', {
      desc: 'Cotton Pique dày dặn, cổ bo dệt không bai, thấm hút mồ hôi tốt.',
      specs: { 'Chất liệu': 'Cotton Pique 95%' },
      variants: { 'Màu sắc': ['Đen', 'Trắng', 'Xanh navy', 'Be'], 'Kích cỡ': ['M', 'L', 'XL', '2XL'] }, tags: ['ao polo', 'ao']
    }),
    // Thời trang nữ
    P('Váy midi hoa nhí cổ vuông phong cách vintage', 'thoi-trang-nu', 'Ivy Moda', 459000, 690000, 4.7, 1640, 7300, '👗', {
      desc: 'Chất voan lụa mềm, hai lớp không lộ, dáng midi thanh lịch.',
      specs: { 'Chất liệu': 'Voan lụa', 'Chiều dài': 'Midi' },
      variants: { 'Màu sắc': ['Hoa xanh', 'Hoa vàng'], 'Kích cỡ': ['S', 'M', 'L'] }, tags: ['vay', 'dam']
    }),
    P('Áo sơ mi nữ lụa công sở tay bồng', 'thoi-trang-nu', 'Elise', 329000, 520000, 4.6, 980, 4600, '👚', {
      mall: true, desc: 'Lụa satin mềm rủ, tay bồng nhẹ nhàng, dễ phối với chân váy và quần âu.',
      specs: { 'Chất liệu': 'Lụa satin' },
      variants: { 'Màu sắc': ['Trắng kem', 'Xanh pastel', 'Đen'], 'Kích cỡ': ['S', 'M', 'L'] }, tags: ['ao so mi', 'ao']
    }),
    P('Chân váy chữ A xếp ly dáng dài', 'thoi-trang-nu', 'Canifa', 249000, 399000, 4.5, 720, 3900, '🩱', {
      hue: 300, desc: 'Xếp ly bền nếp, cạp chun sau thoải mái.',
      variants: { 'Màu sắc': ['Be', 'Đen', 'Nâu'], 'Kích cỡ': ['S', 'M', 'L'] }, tags: ['chan vay', 'vay']
    }),
    // Giày dép
    P("Giày thể thao Nike Air Force 1 '07", 'giay-dep', 'Nike', 2649000, 2929000, 4.9, 2870, 11200, '👟', {
      mall: true, origin: 'Mỹ', desc: 'Thiết kế kinh điển, đệm Air êm ái, da bền đẹp.',
      specs: { 'Chất liệu thân': 'Da thật', 'Đế': 'Cao su' },
      variants: { 'Màu sắc': ['Trắng', 'Đen'], 'Kích cỡ': ['38', '39', '40', '41', '42', '43'] }, tags: ['giay', 'sneaker']
    }),
    P('Giày chạy bộ Adidas Ultraboost Light', 'giay-dep', 'Adidas', 3490000, 4990000, 4.8, 1320, 4200, '👟', {
      mall: true, origin: 'Đức', hue: 190, desc: 'Đệm Light BOOST nhẹ hơn 30%, hoàn trả năng lượng tối đa.',
      specs: { 'Công nghệ đệm': 'Light BOOST', 'Trọng lượng': '295g' },
      variants: { 'Màu sắc': ['Đen', 'Trắng xanh'], 'Kích cỡ': ['39', '40', '41', '42', '43'] }, tags: ['giay', 'chay bo']
    }),
    P("Dép quai ngang Biti's Hunter unisex", 'giay-dep', "Biti's", 179000, 250000, 4.7, 4120, 26800, '🩴', {
      desc: 'Đế EVA siêu nhẹ, chống trơn trượt, thương hiệu Việt.',
      variants: { 'Màu sắc': ['Đen', 'Xám', 'Kem'], 'Kích cỡ': ['38', '39', '40', '41', '42'] }, tags: ['dep', 'giay dep']
    }),
    P("Giày sneaker Biti's Hunter Street", 'giay-dep', "Biti's", 699000, 899000, 4.7, 2310, 9800, '👞', {
      mall: true, hue: 30, desc: 'Đế LiteFoam êm nhẹ, thiết kế trẻ trung phong cách đường phố.',
      variants: { 'Màu sắc': ['Trắng', 'Xám khói'], 'Kích cỡ': ['38', '39', '40', '41', '42', '43'] }, tags: ['giay', 'sneaker']
    }),
    // Mỹ phẩm
    P('Kem chống nắng La Roche-Posay Anthelios SPF50+ 50ml', 'my-pham', 'La Roche-Posay', 389000, 535000, 4.9, 6820, 41200, '🧴', {
      mall: true, origin: 'Pháp', desc: 'Kết cấu mỏng nhẹ, không nhờn rít, bảo vệ da khỏi tia UVA/UVB.',
      specs: { 'Dung tích': '50ml', 'Chỉ số chống nắng': 'SPF50+ PA++++', 'Loại da': 'Mọi loại da' }, tags: ['kem chong nang']
    }),
    P('Serum Vitamin C Klairs Freshly Juiced 35ml', 'my-pham', 'Klairs', 279000, 420000, 4.7, 3120, 15600, '💧', {
      origin: 'Hàn Quốc', hue: 40, desc: '5% Vitamin C dịu nhẹ giúp làm sáng da và mờ thâm.',
      specs: { 'Dung tích': '35ml' }, tags: ['serum']
    }),
    P('Son kem lì 3CE Velvet Lip Tint', 'my-pham', '3CE', 249000, 350000, 4.6, 2540, 12900, '💄', {
      origin: 'Hàn Quốc', desc: 'Chất son mềm mịn như nhung, lên màu chuẩn, bền màu.',
      variants: { 'Màu son': ['Daffodil', 'Taupe', 'Best Ever', 'Speak Up'] }, tags: ['son']
    }),
    P('Nước tẩy trang Bioderma Sensibio H2O 500ml', 'my-pham', 'Bioderma', 359000, 495000, 4.8, 5430, 30800, '🫙', {
      mall: true, origin: 'Pháp', hue: 330, desc: 'Công nghệ Micellar làm sạch dịu nhẹ, phù hợp da nhạy cảm.',
      specs: { 'Dung tích': '500ml' }, tags: ['tay trang']
    }),
    // Nhà cửa
    P('Bộ chăn ga gối cotton Hàn Quốc 5 món', 'nha-cua', 'Everon', 890000, 1450000, 4.6, 640, 2800, '🛏️', {
      mall: true, desc: 'Cotton 100% mềm mát, màu bền, không xù lông sau nhiều lần giặt.',
      variants: { 'Kích thước': ['1m6 x 2m', '1m8 x 2m'], 'Màu sắc': ['Xám ghi', 'Xanh mint'] }, tags: ['chan ga']
    }),
    P('Đèn ngủ LED cảm ứng điều chỉnh độ sáng', 'nha-cua', 'Xiaomi', 249000, 399000, 4.5, 1120, 8900, '💡', {
      origin: 'Trung Quốc', desc: 'Cảm ứng chạm, 3 mức sáng, ánh sáng vàng dịu dễ ngủ.', tags: ['den']
    }),
    P('Kệ sách gỗ 5 tầng lắp ráp thông minh', 'nha-cua', 'NovaHome', 459000, 790000, 4.4, 380, 1900, '🗄️', {
      freeShipping: false, desc: 'Gỗ MDF phủ melamine chống ẩm, lắp ráp dễ dàng trong 15 phút.', tags: ['ke']
    }),
    // Mẹ & bé
    P('Tã quần Bobby size L 68 miếng', 'me-be', 'Bobby', 329000, 389000, 4.8, 4210, 25400, '🧷', {
      mall: true, desc: 'Lõi nén thần kỳ 3mm siêu mỏng, thấm hút nhanh, khô thoáng suốt đêm.',
      variants: { 'Kích cỡ': ['M 76 miếng', 'L 68 miếng', 'XL 62 miếng'] }, tags: ['ta', 'bim']
    }),
    P('Sữa bột Friso Gold 4 850g cho bé 2-4 tuổi', 'me-be', 'Friso', 559000, 625000, 4.9, 2980, 13200, '🍼', {
      mall: true, origin: 'Hà Lan', desc: 'Công nghệ LocNutri giữ nguyên chất đạm tự nhiên, dễ tiêu hóa.', tags: ['sua']
    }),
    // Thực phẩm
    P('Cà phê rang xay Trung Nguyên Legend 500g', 'thuc-pham', 'Trung Nguyên', 225000, 275000, 4.8, 3650, 19800, '☕', {
      mall: true, desc: 'Hạt cà phê Buôn Ma Thuột tuyển chọn, hương thơm đậm đà.', tags: ['ca phe']
    }),
    P('Hạt điều rang muối Bình Phước 500g', 'thuc-pham', 'Lafooco', 189000, 250000, 4.7, 2210, 14300, '🥜', {
      desc: 'Điều loại A size lớn, rang củi giòn thơm, đóng hũ kín.', tags: ['hat dieu']
    }),
    P('Thùng 48 hộp sữa tươi Vinamilk 180ml', 'thuc-pham', 'Vinamilk', 399000, 439000, 4.9, 5820, 36500, '🥛', {
      mall: true, desc: 'Sữa tươi tiệt trùng có đường, bổ sung canxi và vitamin D3.', tags: ['sua']
    }),
    // Sức khỏe
    P('Máy đo huyết áp bắp tay Omron HEM-7121', 'suc-khoe', 'Omron', 890000, 1150000, 4.8, 1840, 7600, '🩺', {
      mall: true, origin: 'Nhật Bản', warranty: 'Bảo hành 5 năm chính hãng.',
      desc: 'Đo nhanh chính xác, phát hiện nhịp tim bất thường, dễ dùng cho người lớn tuổi.', tags: ['may do huyet ap']
    }),
    P('Viên uống Vitamin tổng hợp Blackmores 30 viên', 'suc-khoe', 'Blackmores', 459000, 590000, 4.6, 920, 4100, '💊', {
      origin: 'Úc', desc: 'Bổ sung 26 vitamin và khoáng chất cần thiết mỗi ngày.', tags: ['vitamin']
    }),
    // Thể thao
    P('Thảm tập yoga TPE 6mm chống trượt 2 lớp', 'the-thao', 'Sportslink', 189000, 350000, 4.7, 2640, 17800, '🧘', {
      desc: 'Chất liệu TPE thân thiện môi trường, bám sàn tốt, kèm túi đựng.',
      variants: { 'Màu sắc': ['Tím', 'Xanh ngọc', 'Hồng'] }, tags: ['yoga', 'tham']
    }),
    P('Xe đạp tập thể dục Elip Sport X7', 'the-thao', 'Elipsport', 4990000, 7500000, 4.5, 310, 980, '🚴', {
      freeShipping: false, desc: 'Kháng lực từ tính 8 cấp, vận hành êm, màn hình LCD theo dõi chỉ số.', tags: ['xe dap']
    }),
    P('Bộ tạ tay điều chỉnh 20kg kèm hộp', 'the-thao', 'Kingsport', 890000, 1290000, 4.6, 540, 2600, '🏋️', {
      desc: 'Thay đổi trọng lượng nhanh, tay cầm chống trơn, phù hợp tập tại nhà.', tags: ['ta']
    }),
    // Phụ kiện
    P('Tai nghe chống ồn Sony WH-1000XM5', 'phu-kien', 'Sony', 5990000, 8990000, 4.9, 1980, 6200, '🎧', {
      mall: true, origin: 'Nhật Bản', warranty: 'Bảo hành chính hãng Sony Việt Nam 12 tháng.',
      desc: 'Chống ồn hàng đầu với 8 micro, âm thanh Hi-Res, pin 30 giờ.',
      highlights: ['Chống ồn chủ động 8 micro', 'Pin 30 giờ', 'Sạc nhanh 3 phút nghe 3 giờ'],
      specs: { 'Kết nối': 'Bluetooth 5.2, LDAC', 'Pin': '30 giờ', 'Trọng lượng': '250g' },
      variants: { 'Màu sắc': ['Đen', 'Bạc', 'Xanh nửa đêm'] }, tags: ['tai nghe', 'bluetooth']
    }),
    P('Tai nghe AirPods Pro 2 cổng USB-C', 'phu-kien', 'Apple', 5490000, 6790000, 4.9, 3410, 14700, '🎧', {
      mall: true, origin: 'Mỹ', hue: 215, desc: 'Chống ồn chủ động gấp đôi, âm thanh thích ứng, hộp sạc MagSafe.',
      specs: { 'Chip': 'H2', 'Pin': '6 giờ (30 giờ với hộp)' }, tags: ['tai nghe', 'airpods']
    }),
    P('Tai nghe Bluetooth JBL Tune 520BT', 'phu-kien', 'JBL', 990000, 1490000, 4.7, 1650, 8800, '🎧', {
      origin: 'Mỹ', hue: 20, desc: 'Âm bass JBL Pure Bass, pin 57 giờ, gập gọn tiện lợi.',
      variants: { 'Màu sắc': ['Đen', 'Xanh', 'Trắng'] }, tags: ['tai nghe', 'bluetooth']
    }),
    P('Đồng hồ thông minh Apple Watch SE 2 40mm', 'phu-kien', 'Apple', 5990000, 7490000, 4.8, 1270, 3900, '⌚', {
      mall: true, origin: 'Mỹ', desc: 'Theo dõi sức khỏe, phát hiện té ngã, chống nước 50m.',
      variants: { 'Màu sắc': ['Đêm xanh thẳm', 'Ánh sao', 'Bạc'], 'Kích cỡ': ['40mm', '44mm'] }, tags: ['dong ho']
    }),
    P('Sạc dự phòng Anker PowerCore 20000mAh', 'phu-kien', 'Anker', 790000, 1190000, 4.8, 2860, 16400, '🔋', {
      mall: true, origin: 'Mỹ', desc: 'Sạc nhanh PD 20W, sạc 2 thiết bị cùng lúc, an toàn MultiProtect.', tags: ['sac du phong', 'pin']
    }),
    // Đồ gia dụng
    P('Nồi chiên không dầu Philips 4.1L HD9200', 'gia-dung', 'Philips', 1890000, 2990000, 4.8, 3920, 18200, '🍟', {
      mall: true, origin: 'Hà Lan', warranty: 'Bảo hành 24 tháng chính hãng.',
      desc: 'Công nghệ Rapid Air giảm đến 90% chất béo, dung tích 4.1L cho gia đình 3–4 người.',
      specs: { 'Dung tích': '4.1 lít', 'Công suất': '1.400W' }, tags: ['noi chien']
    }),
    P('Robot hút bụi lau nhà Xiaomi S10', 'gia-dung', 'Xiaomi', 4990000, 7490000, 4.7, 1260, 4800, '🤖', {
      mall: true, origin: 'Trung Quốc', hue: 180, desc: 'Lực hút 4.000Pa, dẫn đường LDS, điều khiển qua ứng dụng.', tags: ['robot hut bui', 'may hut bui']
    }),
    P('Nồi cơm điện tử Sunhouse 1.8L', 'gia-dung', 'Sunhouse', 690000, 990000, 4.6, 2140, 12600, '🍚', {
      desc: 'Lòng nồi chống dính 5 lớp, 8 chế độ nấu, hẹn giờ 24 giờ.', tags: ['noi com']
    }),
    P('Máy xay sinh tố đa năng Lock&Lock 1.5L', 'gia-dung', 'Lock&Lock', 590000, 890000, 4.5, 870, 5300, '🥤', {
      origin: 'Hàn Quốc', desc: 'Lưỡi dao thép không gỉ 6 cánh, cối thủy tinh chịu nhiệt.', tags: ['may xay']
    }),
    // Sách
    P('Sách Nhà Giả Kim – Paulo Coelho', 'sach', 'Nhã Nam', 69000, 89000, 4.9, 8210, 52300, '📕', {
      freeShipping: false, desc: 'Câu chuyện truyền cảm hứng về hành trình theo đuổi ước mơ của cậu bé chăn cừu Santiago.',
      specs: { 'Tác giả': 'Paulo Coelho', 'Số trang': '228', 'Nhà xuất bản': 'NXB Hội Nhà Văn' }, tags: ['sach']
    }),
    P('Sách Đắc Nhân Tâm (Bìa cứng)', 'sach', 'First News', 76000, 108000, 4.9, 9540, 61800, '📗', {
      freeShipping: false, desc: 'Cuốn sách kinh điển về nghệ thuật giao tiếp và thu phục lòng người.',
      specs: { 'Tác giả': 'Dale Carnegie', 'Số trang': '320' }, tags: ['sach']
    }),
    P('Sách Tuổi Trẻ Đáng Giá Bao Nhiêu', 'sach', 'Nhã Nam', 72000, 90000, 4.8, 6120, 43500, '📘', {
      freeShipping: false, desc: 'Những chia sẻ thẳng thắn về học tập, làm việc và trải nghiệm tuổi trẻ.',
      specs: { 'Tác giả': 'Rosie Nguyễn', 'Số trang': '285' }, tags: ['sach']
    }),
    // Ô tô & Xe máy
    P('Mũ bảo hiểm 3/4 Royal M139 kính âm', 'o-to-xe-may', 'Royal', 459000, 590000, 4.7, 1980, 11400, '⛑️', {
      desc: 'Đạt chuẩn QCVN, kính âm chống chói, lót tháo rời vệ sinh dễ dàng.',
      variants: { 'Màu sắc': ['Đen nhám', 'Trắng', 'Xanh rêu'], 'Kích cỡ': ['M', 'L', 'XL'] }, tags: ['mu bao hiem']
    }),
    P('Camera hành trình Vietmap C61 4K', 'o-to-xe-may', 'Vietmap', 2690000, 3490000, 4.6, 860, 3200, '📷', {
      mall: true, desc: 'Ghi hình 4K sắc nét, cảnh báo giao thông bằng giọng nói tiếng Việt.', tags: ['camera hanh trinh']
    }),
    P('Dầu nhớt xe máy Castrol Power1 10W-40 1L', 'o-to-xe-may', 'Castrol', 129000, 155000, 4.8, 3010, 22700, '🛢️', {
      origin: 'Anh', desc: 'Tăng tốc mạnh mẽ, bảo vệ động cơ vượt trội cho xe số và xe tay côn.', tags: ['dau nhot']
    })
  ];

  const productById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  /* ---------- Flash sale (product id -> sale config) ---------- */
  const FLASH_SALE = [
    { id: 'p039', price: 5490000, total: 120, sold: 98 },
    { id: 'p044', price: 1590000, total: 200, sold: 164 },
    { id: 'p022', price: 329000, total: 500, sold: 412 },
    { id: 'p018', price: 2290000, total: 80, sold: 51 },
    { id: 'p014', price: 159000, total: 300, sold: 276 },
    { id: 'p010', price: 1890000, total: 100, sold: 43 },
    { id: 'p031', price: 169000, total: 400, sold: 188 },
    { id: 'p045', price: 4490000, total: 60, sold: 57 },
    { id: 'p043', price: 590000, total: 250, sold: 131 }
  ];
  const flashById = Object.fromEntries(FLASH_SALE.map((f) => [f.id, f]));

  /* ---------- Vouchers ---------- */
  const VOUCHERS = [
    { code: 'NOVA50K', title: 'Giảm ₫50K', desc: 'Đơn tối thiểu ₫299K', type: 'fixed', value: 50000, min: 299000, expires: '31/12/2026', tag: 'Toàn sàn' },
    { code: 'NOVA100K', title: 'Giảm ₫100K', desc: 'Đơn tối thiểu ₫799K', type: 'fixed', value: 100000, min: 799000, expires: '31/12/2026', tag: 'Toàn sàn' },
    { code: 'GIAM10', title: 'Giảm 10%', desc: 'Tối đa ₫200K · Đơn từ ₫500K', type: 'percent', value: 10, max: 200000, min: 500000, expires: '30/11/2026', tag: 'Toàn sàn' },
    { code: 'FREESHIP', title: 'Miễn phí vận chuyển', desc: 'Giảm tối đa ₫30K phí ship', type: 'ship', value: 30000, min: 0, expires: '31/10/2026', tag: 'Freeship' },
    { code: 'MALL300K', title: 'Giảm ₫300K', desc: 'Đơn tối thiểu ₫3 triệu', type: 'fixed', value: 300000, min: 3000000, expires: '31/12/2026', tag: 'NovaMall' },
    { code: 'NEWBIE15', title: 'Giảm 15%', desc: 'Tối đa ₫100K · Đơn từ ₫150K', type: 'percent', value: 15, max: 100000, min: 150000, expires: '31/12/2026', tag: 'Khách mới' }
  ];

  /* ---------- Hero banners ---------- */
  const BANNERS = [
    { title: 'Tuần lễ điện máy', sub: 'Giảm đến 40% máy giặt, tủ lạnh, nồi chiên – trả góp 0%', cta: 'Mua ngay', link: 'products.html?cat=dien-thoai', icons: ['🫧', '🧊', '🍟'], theme: 'coral' },
    { title: 'Laptop cho mùa tựu trường', sub: 'Tặng balo và chuột không dây khi mua laptop từ ₫15 triệu', cta: 'Chọn laptop', link: 'products.html?cat=laptop', icons: ['💻', '🖱️', '🎒'], theme: 'indigo' },
    { title: 'Làm đẹp chính hãng', sub: 'Mỹ phẩm NovaMall 100% chính hãng, đổi trả 30 ngày', cta: 'Khám phá', link: 'products.html?cat=my-pham', icons: ['🧴', '💄', '💧'], theme: 'rose' },
    { title: 'Đi chợ online', sub: 'Thực phẩm giao trong 2 giờ tại Đà Nẵng, Hà Nội, TP.HCM', cta: 'Đi chợ', link: 'products.html?cat=thuc-pham', icons: ['🥛', '☕', '🥜'], theme: 'green' }
  ];

  const BRANDS = [
    { name: 'Apple', tone: 220 }, { name: 'Samsung', tone: 230 }, { name: 'Sony', tone: 0 }, { name: 'Philips', tone: 210 },
    { name: 'Xiaomi', tone: 25 }, { name: 'Nike', tone: 0 }, { name: 'La Roche-Posay', tone: 200 }, { name: 'Vinamilk', tone: 215 },
    { name: "Biti's", tone: 5 }, { name: 'LG', tone: 340 }, { name: 'Logitech', tone: 190 }, { name: 'Anker', tone: 205 }
  ];

  /* ---------- Mock user ---------- */
  const DEFAULT_USER = {
    name: 'Nguyễn Văn A', phone: '0901 234 567', email: 'nguyenvana@novamart.vn', gender: 'Nam', birthday: '1995-06-15',
    address: { name: 'Nguyễn Văn A', phone: '0901 234 567', street: '123 Nguyễn Văn Linh', ward: 'Nam Dương', district: 'Hải Châu', city: 'Đà Nẵng' },
    tier: 'Thành viên Bạc', xu: 1250
  };

  const DEFAULT_NOTIFICATIONS = [
    { id: 'n1', icon: '🎉', title: 'Đơn hàng đang được giao', text: 'Đơn NM2409180021 đã được giao cho đơn vị vận chuyển.', time: Date.now() - 3600000, read: false, link: 'orders.html' },
    { id: 'n2', icon: '🔥', title: 'Flash Sale sắp bắt đầu', text: 'Khung giờ mới mở sau 10 phút – giảm đến 50%.', time: Date.now() - 7200000, read: false, link: 'index.html#flash-sale' },
    { id: 'n3', icon: '🎁', title: 'Bạn nhận được voucher ₫50K', text: 'Thu thập mã NOVA50K để dùng cho đơn từ ₫299K.', time: Date.now() - 86400000, read: false, link: 'index.html#vouchers' },
    { id: 'n4', icon: '📦', title: 'Giao hàng thành công', text: 'Đơn NM2409050007 đã được giao. Đánh giá để nhận 200 xu.', time: Date.now() - 3 * 86400000, read: true, link: 'orders.html' }
  ];

  /* ---------- Reviews (deterministic per product) ---------- */
  const REVIEWERS = ['Trần Minh Khang', 'Lê Thu Hà', 'Phạm Quốc Bảo', 'Nguyễn Hoài An', 'Võ Thanh Tâm', 'Đặng Mỹ Linh', 'Huỳnh Gia Huy', 'Bùi Ngọc Trâm', 'Đỗ Anh Tuấn', 'Hoàng Kim Ngân'];
  const COMMENTS = {
    5: ['Hàng đóng gói cẩn thận, giao nhanh hơn dự kiến. Sản phẩm đúng mô tả, rất hài lòng!', 'Chất lượng tuyệt vời so với giá tiền, shop tư vấn nhiệt tình. Sẽ ủng hộ tiếp.', 'Mua lần thứ hai rồi, vẫn chất lượng như lần đầu. 10 điểm!', 'Giao hàng 1 ngày là tới Đà Nẵng, hàng chính hãng có tem đầy đủ.'],
    4: ['Sản phẩm tốt, chỉ có hộp hơi móp nhẹ do vận chuyển. Nhìn chung ổn.', 'Dùng được một tuần thấy ổn, giá hợp lý trong đợt sale.', 'Hàng đẹp, giao hơi chậm một chút nhưng shop có báo trước.'],
    3: ['Tạm được, màu thực tế hơi khác ảnh một chút.', 'Chất lượng ổn trong tầm giá, không có gì quá nổi bật.'],
    2: ['Giao thiếu phụ kiện, đã liên hệ shop và đang chờ gửi bù.'],
    1: ['Sản phẩm bị lỗi, đã yêu cầu đổi trả.']
  };

  const reviewsFor = (product) => {
    const rnd = NM.seeded(parseInt(product.id.slice(1), 10) * 97 + 13);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const weights = product.rating >= 4.8 ? [80, 14, 4, 1, 1] : product.rating >= 4.6 ? [68, 20, 8, 2, 2] : [55, 25, 12, 5, 3];
    const dist = { 5: weights[0], 4: weights[1], 3: weights[2], 2: weights[3], 1: weights[4] };
    const list = [];
    for (let i = 0; i < 8; i++) {
      const r = rnd() * 100;
      const star = r < weights[0] ? 5 : r < weights[0] + weights[1] ? 4 : r < 97 ? 3 : 2;
      const variantKeys = Object.keys(product.variants);
      const variant = variantKeys.map((k) => `${k}: ${pick(product.variants[k])}`).join(', ');
      const photos = rnd() > 0.55 ? Math.ceil(rnd() * 3) : 0;
      list.push({
        name: pick(REVIEWERS), hue: Math.floor(rnd() * 360), rating: star, text: pick(COMMENTS[star]),
        variant, photos, verified: rnd() > 0.15, date: Date.now() - Math.floor(rnd() * 60 + 1) * 86400000,
        helpful: Math.floor(rnd() * 60)
      });
    }
    return { dist, list };
  };

  Object.assign(NM, {
    CATEGORIES, catById, PRODUCTS, productById, FLASH_SALE, flashById, VOUCHERS, BANNERS, BRANDS,
    DEFAULT_USER, DEFAULT_NOTIFICATIONS, reviewsFor
  });
})(window.NM);
