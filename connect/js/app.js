'use strict';

/* ==========================================================================
   Connect — static social network prototype (vanilla JS)
   1. Mock data   2. Helpers   3. UI primitives   4. Components
   5. Views       6. Features  7. Actions & events 8. Boot
   All data lives in memory. To add a backend later, replace the data
   arrays and the mutation helpers (reactTo, addComment, sendMessage…)
   with API calls; the render functions only read from these objects.
   ========================================================================== */

/* ---------- 1. Mock data ---------- */
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NOW = Date.now();
const ago = ms => NOW - ms;
const photo = name => `assets/photos/${name}.svg`;
const at = (days, h, m = 0) => { const d = new Date(NOW + days * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
const yearsAgo = n => { const d = new Date(NOW); d.setFullYear(d.getFullYear() - n); d.setHours(9, 42, 0, 0); return d.getTime(); };

const ME = 'u1';

const users = [
  { id: 'u1', name: 'Minh Nguyễn', handle: 'minh.nguyen', lang: 'vi', colors: ['#0F766E', '#2DD4BF'], online: true, bio: 'Product designer ở Đà Nẵng. Coffee, code & coastlines.', location: 'Đà Nẵng, Việt Nam', work: 'Product Designer at Lumen Studio', education: 'Đại học Bách khoa Đà Nẵng', hometown: 'Huế, Việt Nam', joined: 'March 2019', website: 'minhnguyen.design', relationship: 'Single', cover: photo('beach'), followers: 1284, following: 312 },
  { id: 'u2', name: 'An Trần', handle: 'an.tran', lang: 'vi', colors: ['#F97316', '#EC4899'], online: true, bio: 'Kiến trúc sư tương lai 🏛️ Sài Gòn ↔ Đà Nẵng', location: 'TP. Hồ Chí Minh', work: 'Intern at Studio Mộc', education: 'ĐH Kiến trúc TP.HCM', hometown: 'Quảng Nam', joined: 'June 2020', cover: photo('hoian'), followers: 856, following: 402, friendCount: 734 },
  { id: 'u3', name: 'Sarah Johnson', handle: 'sarahwrites', lang: 'en', colors: ['#0EA5E9', '#6366F1'], online: true, bio: 'Travel writer from Portland. Currently eating my way through Vietnam.', location: 'Hội An, Việt Nam', work: 'Freelance travel writer', education: 'University of Oregon', hometown: 'Portland, Oregon', joined: 'January 2018', cover: photo('lanterns'), followers: 5210, following: 640, friendCount: 1204 },
  { id: 'u4', name: 'David Lee', handle: 'davidlee', lang: 'en', colors: ['#10B981', '#0EA5E9'], online: false, lastSeen: ago(2 * HOUR), bio: 'Engineering manager. Weekend sailor.', location: 'Singapore', work: 'Engineering Manager at Northwind', education: 'National University of Singapore', hometown: 'Seoul, South Korea', joined: 'May 2017', cover: photo('halong'), followers: 690, following: 210, friendCount: 482 },
  { id: 'u5', name: 'Linh Phạm', handle: 'linh.gocnho', lang: 'vi', colors: ['#E11D48', '#F59E0B'], online: true, bio: 'Barista & latte art nerd ☕ Chủ quán Góc Nhỏ Coffee', location: 'Huế, Việt Nam', work: 'Owner at Góc Nhỏ Coffee', education: 'ĐH Kinh tế Huế', hometown: 'Huế, Việt Nam', joined: 'August 2019', cover: photo('coffee'), followers: 3120, following: 188, friendCount: 912, birthday: true },
  { id: 'u6', name: 'Hoàng Lê', handle: 'hoang.dev', lang: 'vi', colors: ['#8B5CF6', '#EC4899'], online: false, lastSeen: ago(35 * MIN), bio: 'Frontend dev. Đà Nẵng Tech Community organizer.', location: 'Đà Nẵng, Việt Nam', work: 'Frontend Engineer at Sông Hàn Labs', education: 'ĐH Duy Tân', hometown: 'Quảng Ngãi', joined: 'February 2020', cover: photo('skyline'), followers: 1450, following: 520, friendCount: 1033 },
  { id: 'u7', name: 'Mai Võ', handle: 'maivo', lang: 'vi', colors: ['#F43F5E', '#A855F7'], online: true, bio: 'Marketing. Đi đâu cũng được, miễn là có biển 🌊', location: 'Đà Nẵng, Việt Nam', work: 'Marketing Lead at Hải Âu Travel', education: 'ĐH Ngoại ngữ Đà Nẵng', hometown: 'Đà Nẵng', joined: 'October 2018', cover: photo('sunset'), followers: 978, following: 455, friendCount: 866 },
  { id: 'u8', name: 'Kenji Tanaka', handle: 'kenji.frames', lang: 'en', colors: ['#F59E0B', '#EF4444'], online: true, bio: 'Photographer from Osaka. 30 days in Vietnam, one bowl of phở at a time.', location: 'Osaka, Japan', work: 'Photographer', education: 'Osaka University of Arts', hometown: 'Osaka, Japan', joined: 'April 2021', cover: photo('terraces'), followers: 8800, following: 301, friendCount: 402 },
  { id: 'u9', name: 'Priya Sharma', handle: 'priya.ux', lang: 'en', colors: ['#14B8A6', '#84CC16'], online: false, lastSeen: ago(6 * HOUR), bio: 'UX researcher. Asking "why?" professionally.', location: 'Bengaluru, India', work: 'UX Researcher at Kite', education: 'IIT Bombay', hometown: 'Pune, India', joined: 'July 2019', cover: photo('abstract'), followers: 2400, following: 380, friendCount: 590 },
  { id: 'u10', name: 'Tuấn Đặng', handle: 'tuan.sanmay', lang: 'vi', colors: ['#0EA5E9', '#22C55E'], online: false, lastSeen: ago(5 * HOUR), bio: 'Săn mây, săn lúa, săn bình minh 📷', location: 'Hà Nội', work: 'Landscape photographer', education: 'ĐH Mỹ thuật Việt Nam', hometown: 'Yên Bái', joined: 'December 2017', cover: photo('terraces'), followers: 15600, following: 240, friendCount: 1890 },
  { id: 'u11', name: 'Emma Wilson', handle: 'emma.teaches', lang: 'en', colors: ['#EC4899', '#F97316'], online: false, lastSeen: ago(50 * MIN), bio: 'English teacher in Đà Nẵng. Learning Vietnamese, slowly.', location: 'Đà Nẵng, Việt Nam', work: 'Teacher at Bright Minds Academy', education: 'University of Leeds', hometown: 'Leeds, UK', joined: 'September 2022', cover: photo('forest'), followers: 420, following: 390, friendCount: 310 },
  { id: 'u12', name: 'Bảo Ngọc', handle: 'baongoc.art', lang: 'vi', colors: ['#A855F7', '#6366F1'], online: true, bio: 'Sinh viên năm 3 ngành Thiết kế đồ họa 🎨', location: 'Đà Nẵng, Việt Nam', work: 'Freelance illustrator', education: 'ĐH Kiến trúc Đà Nẵng', hometown: 'Tam Kỳ', joined: 'March 2023', cover: photo('abstract'), followers: 610, following: 720, friendCount: 455 },
  { id: 'u13', name: 'Lucas Martin', handle: 'lucas.backpacks', lang: 'en', colors: ['#64748B', '#0EA5E9'], online: false, lastSeen: ago(3 * HOUR), bio: 'Backpacker. Currently somewhere between Huế and Hội An.', location: 'Lyon, France', work: 'Software consultant (on sabbatical)', education: 'INSA Lyon', hometown: 'Lyon, France', joined: 'January 2024', cover: photo('halong'), followers: 280, following: 190, friendCount: 204 },
  { id: 'u14', name: 'Thảo Vy', handle: 'thaovy.an', lang: 'vi', colors: ['#F472B6', '#FB7185'], online: false, lastSeen: ago(20 * MIN), bio: 'Food blogger. Ăn là chính, review là phụ 🍜', location: 'Đà Nẵng, Việt Nam', work: 'Food writer at Ăn Gì Đà Nẵng', education: 'ĐH Kinh tế Đà Nẵng', hometown: 'Hội An', joined: 'May 2020', cover: photo('pho'), followers: 22100, following: 540, friendCount: 2300 },
];

const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like', color: 'var(--brand)' },
  { key: 'love', emoji: '❤️', label: 'Love', color: '#E5484D' },
  { key: 'haha', emoji: '😂', label: 'Haha', color: '#E8912D' },
  { key: 'wow', emoji: '😮', label: 'Wow', color: '#E8912D' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: '#E8912D' },
  { key: 'angry', emoji: '😡', label: 'Angry', color: '#E8590C' },
];

const PRIVACY = {
  public: { icon: 'globe', label: 'Public' },
  friends: { icon: 'users', label: 'Friends' },
  private: { icon: 'lock', label: 'Only me' },
};

let cid = 0;
const cm = (userId, text, minsAgo, likes = 0) => ({ id: `cm${++cid}`, userId, text, time: ago(minsAgo * MIN), likes, liked: false });
const img = (name, alt) => ({ src: photo(name), alt });

let posts = [
  { id: 'p1', userId: 'u2', time: ago(25 * MIN), privacy: 'friends', type: 'text',
    text: `Cuối cùng cũng bảo vệ xong đồ án tốt nghiệp rồi! 🎓\n\n4 năm, 3 cái laptop, không biết bao nhiêu ly cà phê sữa đá. Cảm ơn thầy cô, bạn bè và gia đình đã luôn ở bên. Tối nay ai rảnh đi ăn mừng không? 🥳`,
    reactions: { like: 48, love: 31, haha: 2, wow: 5 }, shares: 3,
    comments: [cm('u5', 'Chúc mừng An!! Giỏi quá trời 🎉', 20, 4), cm('u7', 'Tối nay quán cũ nha, Mai bao nước 😆', 14, 6), cm('u3', `Congratulations! That's a huge milestone 👏`, 9, 2)] },
  { id: 'p2', userId: 'u3', time: ago(2 * HOUR), privacy: 'public', location: 'Hội An', type: 'image',
    images: [img('lanterns', 'Silk lanterns glowing above a street in Hội An at night')],
    text: `First night in Hội An and I finally understand why everyone falls in love with this town. The lanterns come on at dusk and the whole old quarter just glows. ✨\n\nAny must-try food spots? I'm here until Sunday. #HoiAn #TravelVietnam`,
    reactions: { like: 212, love: 148, wow: 19 }, shares: 14,
    comments: [cm('u10', 'Nhất định phải thử cao lầu và bánh mì Phượng nha Sarah!', 95, 12), cm('u8', 'Mì Quảng near the Japanese Bridge was my favourite. Go early!', 80, 7), cm('u5', 'Try the white rose dumplings (bánh bao bánh vạc) 🌹', 41, 5), cm('u1', 'Welcome to Quảng Nam! Ping me if you come up to Đà Nẵng.', 30, 3)] },
  { id: 'p3', userId: 'u4', time: ago(5 * HOUR), privacy: 'public', location: 'Vịnh Hạ Long', type: 'images',
    images: [img('halong', 'Limestone karsts rising from the water in Hạ Long Bay'), img('sunset', 'Sunset over layered mountains'), img('beach', 'A sandy beach with umbrellas'), img('forest', 'Misty pine forest'), img('skyline', 'City skyline at dusk')],
    text: `Team offsite in Hạ Long Bay 🚢 Two days, zero Slack notifications, and one very competitive kayak race (we lost). Already planning next year.`,
    reactions: { like: 96, love: 40, haha: 12 }, shares: 5,
    comments: [cm('u6', 'Đẹp quá anh ơi! Công ty còn tuyển không 😂', 200, 9), cm('u1', 'The second photo is wallpaper material.', 150, 2)] },
  { id: 'p4', userId: 'u5', time: ago(8 * HOUR), privacy: 'public', type: 'video', views: '12K',
    video: { poster: photo('coffee'), duration: 192, title: 'Cà phê muối kiểu Huế' },
    text: `Hướng dẫn pha cà phê muối kiểu Huế tại nhà ☕🧂 Bí quyết là lớp kem muối phải đánh thật bông, rồi rót từ từ lên cà phê phin nóng. Ai thử rồi comment kết quả cho Linh xem nha! #CaPheMuoi`,
    reactions: { like: 340, love: 122, wow: 31 }, shares: 58,
    comments: [cm('u14', 'Mai Vy ghé quán review liền 😍', 400, 21), cm('u11', 'I tried this in Huế last month — life changing!', 300, 8)] },
  { id: 'p5', userId: 'u6', time: ago(11 * HOUR), privacy: 'public', type: 'shared', sharedId: 'p9',
    text: 'Rất đúng! Mấy bạn khách quốc tế ghé Đà Nẵng tuần này nhớ đọc bài này của Kenji nhé 👇',
    reactions: { like: 27, love: 6 }, shares: 1,
    comments: [cm('u8', 'Thanks for sharing, Hoàng! 🙏', 600, 3)] },
  { id: 'p6', userId: 'u7', time: ago(14 * HOUR), privacy: 'friends', type: 'poll',
    text: 'Cuối tuần này team mình đi đâu nhỉ? 🤔 Vote giúp Mai với, hạn chót tối thứ Sáu!',
    poll: { options: [{ id: 'o1', text: 'Bà Nà Hills 🚠', votes: 34 }, { id: 'o2', text: 'Bán đảo Sơn Trà 🐒', votes: 51 }, { id: 'o3', text: 'Cù Lao Chàm 🏝️', votes: 27 }, { id: 'o4', text: 'Ở nhà ngủ 😴', votes: 12 }], myVote: null, endsIn: '2 days' },
    reactions: { like: 18, haha: 9 }, shares: 0,
    comments: [cm('u2', 'Sơn Trà đi, sáng sớm lên ngắm voọc 🐒', 800, 5)] },
  { id: 'p7', userId: 'u8', time: ago(DAY + 2 * HOUR), privacy: 'public', location: 'Đà Nẵng', type: 'image',
    images: [img('pho', 'A bowl of phở with beef, herbs and lime')],
    text: 'Day 12 in Vietnam: phở for breakfast again. I think I might never go back to cereal. 🍜',
    reactions: { like: 402, love: 190, haha: 44 }, shares: 11,
    comments: [cm('u14', 'Kenji ơi thử phở bò tái lăn ở Hà Nội nữa nha!', 1500, 15), cm('u4', 'Cereal never stood a chance.', 1400, 11)] },
  { id: 'p8', userId: 'u1', time: ago(DAY + 6 * HOUR), privacy: 'public', type: 'text',
    text: `Redesigning our onboarding flow this week. Hot take: the best onboarding is the one users barely notice.\n\nWhat's the smoothest first-run experience you've had in an app? Looking for inspiration 👀 #UXDesign`,
    reactions: { like: 64, love: 12, wow: 3 }, shares: 4,
    comments: [cm('u6', 'Linear và Arc làm onboarding rất mượt, ít bước mà vẫn hiểu ngay.', 1700, 6), cm('u3', `Duolingo lets you start a lesson before signing up — that's the move.`, 1650, 9), cm('u2', 'Tối giản nhưng có một khoảnh khắc "wow" nho nhỏ là đủ 😄', 1600, 4)] },
  { id: 'p9', userId: 'u8', time: ago(3 * DAY), privacy: 'public', type: 'text',
    text: `A few things I wish I knew before my first week in Vietnam:\n\n1. Learn "xin chào" (hello) and "cảm ơn" (thank you). People light up when you try.\n2. Crossing the street: walk slowly and steadily. Don't stop, don't run.\n3. The best food is at the plastic-stool places with the longest queues.\n4. Always carry small notes for street food and parking.`,
    reactions: { like: 820, love: 210, haha: 64 }, shares: 132,
    comments: [cm('u11', 'Number 2 took me a whole month to master 😅', 4000, 30)] },
  { id: 'p10', userId: 'u10', time: ago(2 * DAY), privacy: 'public', location: 'Mù Cang Chải, Yên Bái', type: 'images',
    images: [img('terraces', 'Golden rice terraces on a hillside'), img('forest', 'Mist rolling through a pine forest'), img('sunset', 'Sunrise over mountain ridges')],
    text: 'Mù Cang Chải mùa lúa chín 🌾 Dậy từ 4h sáng chạy xe 2 tiếng để kịp bình minh, và hoàn toàn xứng đáng. #MuCangChai',
    reactions: { like: 1840, love: 920, wow: 210 }, shares: 305,
    comments: [cm('u8', 'This is unreal. Adding it to my list!', 2800, 44), cm('u7', 'Anh Tuấn ơi cho em xin lịch trình với ạ', 2700, 12)] },
  { id: 'p11', userId: 'u6', time: ago(2 * DAY + 5 * HOUR), privacy: 'public', type: 'image',
    images: [img('workspace', 'A laptop, notebook and plant on a desk')],
    text: 'Đà Nẵng Tech Meetup #12 sẽ diễn ra tối thứ Năm này tại Sông Hàn Labs! Chủ đề: "Design systems cho team nhỏ". Có pizza, có sticker, có networking 🚀 Đăng ký ở mục Events nhé.',
    reactions: { like: 132, love: 20 }, shares: 22,
    comments: [cm('u1', 'Mình sẽ tới, mang theo slide về onboarding luôn 😄', 3100, 8)] },
  { id: 'p12', userId: 'u2', time: ago(4 * DAY), privacy: 'public', location: 'Cầu Rồng, Đà Nẵng', type: 'image',
    images: [img('fireworks', 'Fireworks bursting over the river at night')],
    text: 'Pháo hoa bên sông Hàn đêm qua đẹp xỉu 🎆 Năm nào cũng đi mà năm nào cũng nổi da gà. #DaNangFireworks',
    reactions: { like: 520, love: 301, wow: 88 }, shares: 40,
    comments: [cm('u7', 'Mai đứng ngay cạnh An mà không thấy nhau 😂', 5000, 14)] },
];

const memories = [
  { id: 'm1', userId: 'u1', time: yearsAgo(3), privacy: 'public', type: 'image', images: [img('workspace', 'A new desk setup on the first day at work')],
    text: 'Ngày đầu tiên đi làm ở Lumen Studio! Bàn làm việc mới, laptop mới, và một chút run tay 😅', reactions: { like: 88, love: 40 }, shares: 0,
    comments: [cm('u6', 'Chúc mừng ông! Welcome to the grind 💪', 3 * 365 * 24 * 60, 3)] },
  { id: 'm2', userId: 'u1', time: yearsAgo(6), privacy: 'friends', type: 'image', images: [img('skyline', 'Đà Nẵng skyline at dusk on graduation day')],
    text: 'Tốt nghiệp rồi!!! 🎓 Cảm ơn Bách khoa vì 5 năm thanh xuân. Đà Nẵng hôm nay đẹp lạ.', reactions: { like: 150, love: 74, haha: 3 }, shares: 2, comments: [] },
];

/* Every post gets the same shape so render code never needs to guess. */
[...posts, ...memories].forEach(p => { p.myReaction = p.myReaction || null; p.reactions = p.reactions || {}; });

let stories = [
  { userId: 'u3', seen: false, slides: [{ type: 'image', src: photo('lanterns'), caption: 'Hội An by night 🏮', time: ago(HOUR) }, { type: 'image', src: photo('hoian'), caption: 'Yellow walls everywhere', time: ago(50 * MIN) }] },
  { userId: 'u5', seen: false, slides: [{ type: 'image', src: photo('coffee'), caption: 'Mẻ cà phê muối đầu tiên hôm nay ☕', time: ago(2 * HOUR) }] },
  { userId: 'u8', seen: false, slides: [{ type: 'image', src: photo('pho'), time: ago(3 * HOUR) }, { type: 'text', text: 'Day 12. Still not tired of phở.', bg: 'linear-gradient(135deg,#F59E0B,#EF4444)', time: ago(3 * HOUR) }] },
  { userId: 'u7', seen: false, slides: [{ type: 'image', src: photo('beach'), caption: 'Mỹ Khê sáng nay 🌊', time: ago(4 * HOUR) }] },
  { userId: 'u10', seen: false, slides: [{ type: 'image', src: photo('terraces'), time: ago(6 * HOUR) }, { type: 'image', src: photo('sunset'), caption: 'Bình minh trên đèo Khau Phạ', time: ago(6 * HOUR) }] },
  { userId: 'u4', seen: true, slides: [{ type: 'image', src: photo('halong'), caption: 'Back to reality tomorrow', time: ago(9 * HOUR) }] },
  { userId: 'u6', seen: true, slides: [{ type: 'text', text: 'Meetup #12 tối thứ Năm này! Đăng ký trong mục Events 🚀', bg: 'linear-gradient(135deg,#0F766E,#8B5CF6)', time: ago(12 * HOUR) }] },
];

let conversations = [
  { id: 'c1', userId: 'u2', unread: 2, seen: true, messages: [
    { from: 'u2', text: 'Minh ơi, tối nay đi ăn mừng không?', time: ago(40 * MIN) },
    { from: 'u1', text: 'Đi chứ! Chúc mừng An nha 🎉', time: ago(38 * MIN) },
    { from: 'u2', text: 'Quán lẩu cũ ở Nguyễn Văn Linh nhé, 7h', time: ago(12 * MIN) },
    { from: 'u2', text: 'Rủ thêm Linh với Mai luôn', time: ago(11 * MIN) }] },
  { id: 'c2', userId: 'u3', unread: 1, seen: true, messages: [
    { from: 'u3', text: 'Hi Minh! Are you still in Đà Nẵng next weekend?', time: ago(DAY + 3 * HOUR) },
    { from: 'u1', text: `Yes! Let me know when you arrive, I'll show you around.`, time: ago(DAY + 2 * HOUR) },
    { from: 'u3', text: 'Amazing. Is the Dragon Bridge fire show every weekend?', time: ago(HOUR) }] },
  { id: 'c3', userId: 'u5', unread: 0, seen: true, messages: [
    { from: 'u5', text: 'Mai ghé quán thử món mới nha, cà phê trứng muối 😋', time: ago(3 * HOUR) },
    { from: 'u1', text: 'Nghe hấp dẫn quá, chiều mai mình ghé!', time: ago(2 * HOUR) }] },
  { id: 'c4', userId: 'u4', unread: 0, seen: true, messages: [
    { from: 'u4', text: 'Sending you the offsite photos later today.', time: ago(6 * HOUR) },
    { from: 'u1', text: 'Thanks David! The Hạ Long ones look incredible.', time: ago(5 * HOUR) }] },
  { id: 'c5', userId: 'u6', unread: 0, seen: false, messages: [
    { from: 'u6', text: 'Slide cho meetup xong chưa ông?', time: ago(DAY) },
    { from: 'u1', text: 'Xong 80% rồi, tối nay gửi bản nháp nha', time: ago(DAY - 20 * MIN) }] },
  { id: 'c6', userId: 'u8', unread: 0, seen: true, messages: [
    { from: 'u8', text: 'Thanks for the phở recommendation! Went twice already 😂', time: ago(2 * DAY) }] },
  { id: 'c7', userId: 'u7', unread: 0, seen: true, messages: [
    { from: 'u7', text: 'Nhớ vote poll của Mai nha!', time: ago(14 * HOUR) }] },
];

let notifications = [
  { id: 'n1', type: 'reaction', userId: 'u3', text: 'reacted ❤️ to your post: "Redesigning our onboarding flow…"', time: ago(18 * MIN), read: false, link: '#/post/p8' },
  { id: 'n2', type: 'message', userId: 'u2', text: 'sent you a message: "Rủ thêm Linh với Mai luôn"', time: ago(11 * MIN), read: false, link: '#/messages/c1' },
  { id: 'n3', type: 'comment', userId: 'u2', text: 'commented on your post: "Tối giản nhưng có một khoảnh khắc wow…"', time: ago(52 * MIN), read: false, link: '#/post/p8' },
  { id: 'n4', type: 'friend_request', userId: 'u12', text: 'sent you a friend request.', time: ago(2 * HOUR), read: false, link: '#/profile/u12' },
  { id: 'n5', type: 'follow', userId: 'u9', text: 'started following you.', time: ago(4 * HOUR), read: false, link: '#/profile/u9' },
  { id: 'n6', type: 'friend_request', userId: 'u13', text: 'sent you a friend request.', time: ago(9 * HOUR), read: true, link: '#/profile/u13' },
  { id: 'n7', type: 'event', userId: 'u6', text: 'invited you to "Đà Nẵng Tech Meetup #12".', time: ago(DAY), read: true, link: '#/events' },
  { id: 'n8', type: 'group', userId: 'u14', text: 'posted in Đà Nẵng Foodies: "Quán bánh xèo mới mở ở Hải Châu…"', time: ago(DAY + 4 * HOUR), read: true, link: '#/groups' },
  { id: 'n9', type: 'birthday', userId: 'u5', text: 'has a birthday today. Send her a wish! 🎂', time: ago(7 * HOUR), read: true, link: '#/profile/u5' },
  { id: 'n10', type: 'reaction', userId: 'u4', text: 'and 23 others liked your post.', time: ago(3 * DAY), read: true, link: '#/post/p8' },
];

let events = [
  { id: 'e1', title: 'Đà Nẵng Tech Meetup #12', date: at(2, 19), place: 'Sông Hàn Labs, Hải Châu', cover: photo('workspace'), going: 86, interested: 214, status: 'going', host: 'u6' },
  { id: 'e2', title: 'Dragon Bridge fire show', date: at(3, 21), place: 'Cầu Rồng, Đà Nẵng', cover: photo('fireworks'), going: 1200, interested: 3400, status: 'interested', host: 'u7' },
  { id: 'e3', title: 'Sunrise yoga at Mỹ Khê', date: at(4, 5, 30), place: 'Bãi biển Mỹ Khê', cover: photo('beach'), going: 42, interested: 130, status: null, host: 'u7' },
  { id: 'e4', title: 'Latte art workshop', date: at(9, 15), place: 'Góc Nhỏ Coffee, Huế', cover: photo('coffee'), going: 18, interested: 96, status: null, host: 'u5' },
  { id: 'e5', title: 'Photo walk: Hội An old quarter', date: at(12, 16, 30), place: 'Chùa Cầu, Hội An', cover: photo('hoian'), going: 64, interested: 210, status: null, host: 'u10' },
];

let groups = [
  { id: 'g1', name: 'Đà Nẵng Foodies', members: 48200, cover: photo('pho'), joined: true, privacy: 'public', desc: 'Chia sẻ quán ngon, món lạ ở Đà Nẵng. Review thật, không quảng cáo.', activity: '25 new posts today',
    discussion: [{ userId: 'u14', text: 'Quán bánh xèo mới mở ở Hải Châu, giòn rụm mà chỉ 30k một phần!', time: ago(DAY + 4 * HOUR) }, { userId: 'u7', text: 'Ai biết chỗ nào bán mì Quảng ếch ngon gần Sơn Trà không?', time: ago(2 * DAY) }] },
  { id: 'g2', name: 'UX Designers Vietnam', members: 12900, cover: photo('workspace'), joined: true, privacy: 'private', desc: 'Cộng đồng thiết kế trải nghiệm người dùng: portfolio review, job board, và thảo luận.', activity: '8 new posts today',
    discussion: [{ userId: 'u9', text: 'Sharing my template for usability test notes. Feedback welcome!', time: ago(5 * HOUR) }] },
  { id: 'g3', name: 'Vietnam Travel Tips (EN)', members: 210000, cover: photo('halong'), joined: false, privacy: 'public', desc: 'Honest advice for travelling in Vietnam: visas, transport, food and etiquette.', activity: '120 new posts today',
    discussion: [{ userId: 'u13', text: 'Best way to get from Huế to Hội An? Train or the Hải Vân pass by bike?', time: ago(3 * HOUR) }] },
  { id: 'g4', name: 'Hội Nhiếp Ảnh Phong Cảnh', members: 65400, cover: photo('terraces'), joined: false, privacy: 'public', desc: 'Nơi chia sẻ ảnh phong cảnh Việt Nam và kinh nghiệm săn ảnh.', activity: '40 new posts today',
    discussion: [{ userId: 'u10', text: 'Lịch lúa chín Mù Cang Chải năm nay dự kiến sớm hơn 1 tuần.', time: ago(DAY) }] },
  { id: 'g5', name: 'Cà Phê & Chuyện', members: 8700, cover: photo('coffee'), joined: true, privacy: 'public', desc: 'Dành cho những người mê cà phê: pha chế, quán xá và những câu chuyện bên ly.', activity: '3 new posts today',
    discussion: [{ userId: 'u5', text: 'Tuần sau Góc Nhỏ mở lớp latte art cuối tuần, ai tham gia không?', time: ago(9 * HOUR) }] },
  { id: 'g6', name: 'Expats in Đà Nẵng', members: 31800, cover: photo('beach'), joined: false, privacy: 'private', desc: 'Housing, visas, language exchange and meetups for people living in Đà Nẵng.', activity: '17 new posts today',
    discussion: [{ userId: 'u11', text: 'Weekly Vietnamese–English language exchange this Saturday at 4pm!', time: ago(6 * HOUR) }] },
];

const trends = [
  { tag: 'DaNangFireworks', count: 18200 },
  { tag: 'HoiAn', count: 9600 },
  { tag: 'CaPheMuoi', count: 5100 },
  { tag: 'MuCangChai', count: 2800 },
  { tag: 'UXDesign', count: 3400 },
];

const REPLIES = {
  vi: ['Haha chuẩn luôn 😆', 'Ok nha, để mình xem rồi báo lại', 'Tuyệt vời! 👍', 'Thiệt hả? Kể nghe coi', 'Tối nay rảnh không?', 'Cảm ơn nha ❤️'],
  en: ['Haha, love that 😄', 'Sounds great, let me check and get back to you', 'Oh nice! 👏', 'Wait, really? Tell me more', 'Thanks so much ❤️', 'Perfect, see you then!'],
};

const FEELINGS = ['😊 happy', '🥳 excited', '😌 relaxed', '🤩 inspired', '🙏 grateful', '☕ caffeinated', '😴 sleepy', '💪 motivated'];
const SAMPLE_PHOTOS = [img('beach', 'Beach'), img('hoian', 'Hội An street'), img('lanterns', 'Lanterns'), img('coffee', 'Coffee'), img('pho', 'Phở'), img('sunset', 'Sunset'), img('terraces', 'Rice terraces'), img('skyline', 'Skyline'), img('fireworks', 'Fireworks')];
const STORY_BGS = ['linear-gradient(135deg,#0F766E,#2DD4BF)', 'linear-gradient(135deg,#F97316,#EC4899)', 'linear-gradient(135deg,#E8912D,#E11D48)', 'linear-gradient(135deg,#0EA5E9,#22C55E)', 'linear-gradient(135deg,#1F2937,#4B5563)', 'linear-gradient(135deg,#A855F7,#F43F5E)'];
const EMOJIS = ['😀', '😂', '😍', '🥰', '😮', '😢', '👍', '🙏', '🎉', '🔥', '❤️', '☕'];

/* Relationships of the signed-in user */
const rel = {
  friends: new Set(['u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u10']),
  requestsIn: ['u12', 'u13'],
  requestsOut: new Set(),
  following: new Set(['u3', 'u8', 'u10']),
  dismissed: new Set(),
};

/* ---------- 2. Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
const getUser = id => users.find(u => u.id === id);
const getPost = id => posts.find(p => p.id === id) || memories.find(p => p.id === id);
const getConv = id => conversations.find(c => c.id === id);
const me = () => getUser(ME);
const firstName = u => u.name.split(/\s+/)[0];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const uid = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const initials = name => { const parts = name.trim().split(/\s+/); return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase(); };
const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const isEmojiOnly = s => !!s && /^[\p{Extended_Pictographic}\u200d\ufe0f\s]{1,12}$/u.test(s) && !/\d/.test(s);
const sumReactions = p => Object.values(p.reactions).reduce((a, b) => a + b, 0);

function fmtCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'K';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
const plural = (n, word) => `${fmtCount(n)} ${word}${n === 1 ? '' : 's'}`;
const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fullDate = t => new Date(t).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function timeAgo(t, long = false) {
  const d = Date.now() - t;
  if (d < MIN) return 'Just now';
  const m = Math.floor(d / MIN), h = Math.floor(d / HOUR), days = Math.floor(d / DAY);
  if (d < HOUR) return long ? `${m} min ago` : `${m}m`;
  if (d < DAY) return long ? `${h} hour${h > 1 ? 's' : ''} ago` : `${h}h`;
  if (days === 1 && long) return `Yesterday at ${clock(t)}`;
  if (d < 7 * DAY) return long ? `${days} days ago` : `${days}d`;
  const date = new Date(t);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
function dayLabel(t) {
  if (sameDay(t, Date.now())) return 'Today';
  if (sameDay(t, Date.now() - DAY)) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable (private mode / file://) */ } },
};

const settings = Object.assign({ defaultPrivacy: 'friends', activeStatus: true, previews: true, sounds: false, reduceMotion: false }, store.get('connect:settings', {}));
const saveSettings = () => store.set('connect:settings', settings);

const ui = {
  route: { view: 'feed', param: null }, title: 'Home',
  feedFilter: 'all', feedLoaded: false, pendingNew: null,
  profileId: null, profileTab: 'posts', friendsTab: null, eventsTab: 'upcoming', notifFilter: 'all',
  expanded: new Set(), videos: new Map(), saved: new Set(['p10', 'p9']), hidden: new Set(),
  myStory: null, convQuery: '', photoList: [], recent: store.get('connect:recent', ['Hội An', 'cà phê muối']),
  prefill: null,
};

function readImages(files) {
  return Promise.all([...files].filter(f => f.type.startsWith('image/')).slice(0, 10).map(f => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res({ src: r.result, alt: f.name.replace(/\.[^.]+$/, '') });
    r.onerror = () => res(null);
    r.readAsDataURL(f);
  }))).then(list => list.filter(Boolean));
}
function pickImages({ multiple = true } = {}) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = multiple;
    input.addEventListener('change', () => readImages(input.files).then(resolve));
    input.click();
  });
}
function autosize(ta, max = 200) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, max) + 'px'; }

/* Relationship helpers */
function relationOf(id) {
  if (id === ME) return 'me';
  if (rel.friends.has(id)) return 'friend';
  if (rel.requestsIn.includes(id)) return 'incoming';
  if (rel.requestsOut.has(id)) return 'outgoing';
  return 'none';
}
function friendsOf(id) {
  if (id === ME) return [...rel.friends].map(getUser);
  const idx = users.findIndex(u => u.id === id);
  return users.filter((u, i) => u.id !== id && (u.id === ME ? rel.friends.has(id) : (i + idx) % 3 !== 0));
}
const friendCount = u => (u.id === ME ? rel.friends.size : u.friendCount || friendsOf(u.id).length);
const mutualFriends = u => (u.id === ME ? [] : friendsOf(u.id).filter(f => rel.friends.has(f.id)));
const suggestions = () => users.filter(u => u.id !== ME && !rel.friends.has(u.id) && !rel.requestsIn.includes(u.id) && !rel.dismissed.has(u.id));
const isOnline = u => (u.id === ME ? settings.activeStatus : !!u.online);
const presence = u => (isOnline(u) ? 'Active now' : u.lastSeen ? `Active ${timeAgo(u.lastSeen)} ago` : 'Offline');
function relLabel(u) {
  const r = relationOf(u.id);
  if (r === 'friend') return 'Friend';
  if (r === 'incoming') return 'Sent you a friend request';
  if (r === 'outgoing') return 'Request sent';
  const n = mutualFriends(u).length;
  return n ? `${n} mutual friend${n > 1 ? 's' : ''}` : u.location || '';
}
function convWith(userId) {
  let c = conversations.find(x => x.userId === userId);
  if (!c) { c = { id: uid('c'), userId, unread: 0, seen: true, messages: [] }; conversations.unshift(c); }
  return c;
}
const lastTime = c => (c.messages.length ? c.messages[c.messages.length - 1].time : 0);
const sortedConvs = () => conversations.slice().sort((a, b) => lastTime(b) - lastTime(a));

/* ---------- 3. UI primitives ---------- */
const main = $('#main');

function toast(msg, { icon: ic = 'check', action, onAction, timeout = 3600, html = false } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(ic)}<span class="toast__msg">${html ? msg : esc(msg)}</span>${action ? `<button class="toast__action" type="button">${esc(action)}</button>` : ''}`;
  $('#toastRoot').append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const remove = () => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 320); };
  const timer = setTimeout(remove, timeout);
  if (action) $('.toast__action', el).addEventListener('click', () => { clearTimeout(timer); remove(); onAction?.(); });
  const all = $$('.toast', $('#toastRoot'));
  if (all.length > 3) all[0].remove();
}

function chime() {
  if (!settings.sounds) return;
  try {
    const ctx = chime.ctx || (chime.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
  } catch { /* audio not available */ }
}

/* Modals (stackable) */
const modalStack = [];
const focusables = root => $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', root).filter(el => el.offsetParent !== null || el === document.activeElement);

function openModal({ title = '', content = '', className = '', label, onClose, bare = false, initialFocus } = {}) {
  closeMenu();
  const lastFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = `modal ${className}`;
  wrap.innerHTML = `<div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-label="${esc(label || title)}" tabindex="-1">
      ${bare ? '' : `<header class="modal__head"><h2 class="modal__title">${esc(title)}</h2><button class="icon-btn icon-btn--filled modal__close" type="button" data-close aria-label="Close">${icon('x')}</button></header>`}
      <div class="modal__body">${content}</div>
    </div>`;
  document.body.append(wrap);
  document.body.classList.add('no-scroll');
  modalStack.push({ el: wrap, lastFocus, onClose });
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(wrap); });
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const target = (initialFocus && $(initialFocus, wrap)) || focusables($('.modal__body', wrap))[0] || $('.modal__dialog', wrap);
  setTimeout(() => target.focus({ preventScroll: true }), 30);
  return wrap;
}
function closeModal(el) {
  const i = el ? modalStack.findIndex(m => m.el === el) : modalStack.length - 1;
  if (i < 0) return;
  const [m] = modalStack.splice(i, 1);
  m.onClose?.();
  m.el.classList.remove('is-open');
  setTimeout(() => m.el.remove(), 240);
  if (!modalStack.length) document.body.classList.remove('no-scroll');
  if (m.lastFocus && document.contains(m.lastFocus)) m.lastFocus.focus({ preventScroll: true });
}
const topModal = () => modalStack[modalStack.length - 1]?.el;
function trapFocus(e, root) {
  const f = focusables(root);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function confirmDialog({ title, text, confirmText = 'Confirm', danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const m = openModal({ title, className: 'modal--sm', content: `<p class="confirm__text">${esc(text)}</p><div class="modal__actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" data-confirm>${esc(confirmText)}</button></div>`,
      onClose: () => { if (!done) resolve(false); }, initialFocus: '[data-confirm]' });
    $('[data-confirm]', m).addEventListener('click', () => { done = true; resolve(true); closeModal(m); });
  });
}

/* Floating context menu (post options, friend options…) */
let activeMenu = null;
function openMenu(anchor, items) {
  closeMenu();
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  el.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" class="menu__item${it.danger ? ' is-danger' : ''}" data-i="${i}">${icon(it.icon)}<span class="menu__label">${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span>${it.checked ? icon('check', 'icon--sm menu__check') : ''}</button>`).join('');
  document.body.append(el);
  const r = anchor.getBoundingClientRect(), mw = el.offsetWidth, mh = el.offsetHeight;
  const left = Math.min(Math.max(8, r.right - mw), innerWidth - mw - 8);
  let top = r.bottom + 6;
  if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  el.style.left = `${left}px`; el.style.top = `${top}px`;
  requestAnimationFrame(() => el.classList.add('is-open'));
  anchor.setAttribute('aria-expanded', 'true');
  activeMenu = { el, anchor };
  el.addEventListener('click', e => {
    const b = e.target.closest('.menu__item');
    if (!b) return;
    const it = items[+b.dataset.i];
    closeMenu();
    it.run?.();
  });
  el.addEventListener('keydown', e => {
    const list = $$('.menu__item', el), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Tab') closeMenu(true);
  });
  $('.menu__item', el)?.focus({ preventScroll: true });
}
function closeMenu(returnFocus = false) {
  if (!activeMenu) return;
  const { el, anchor } = activeMenu;
  activeMenu = null;
  anchor.setAttribute('aria-expanded', 'false');
  el.classList.remove('is-open');
  setTimeout(() => el.remove(), 160);
  if (returnFocus && document.contains(anchor)) anchor.focus();
}

/* Top bar dropdown panels */
const DROPDOWN_RENDER = { 'dd-notifs': () => renderNotifDropdown(), 'dd-account': () => renderAccountDropdown() };
function toggleDropdown(btn) {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  const willOpen = !panel.classList.contains('is-open');
  closeDropdowns();
  if (!willOpen) return;
  DROPDOWN_RENDER[panel.id]?.();
  panel.classList.add('is-open');
  btn.setAttribute('aria-expanded', 'true');
}
function closeDropdowns() {
  $$('.dropdown.is-open').forEach(d => {
    d.classList.remove('is-open');
    $$(`[aria-controls="${d.id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
  });
}
const isOpen = id => $(`#${id}`)?.classList.contains('is-open');

/* Drawer & mobile search */
function openDrawer() { document.body.classList.add('drawer-open'); $('#sidebarLeft').classList.add('is-open'); setTimeout(() => $('#sidebarLeft .side-link')?.focus(), 60); }
function closeDrawer() { document.body.classList.remove('drawer-open'); $('#sidebarLeft').classList.remove('is-open'); }
function openSearch() { document.body.classList.add('search-open'); $('#searchInput').focus(); }
function closeSearch() { document.body.classList.remove('search-open'); if (isOpen('dd-search')) closeDropdowns(); }

/* Theme */
const isDark = () => document.documentElement.dataset.theme === 'dark';
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('connect:theme', t);
  $('#themeBtn').innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  $('#themeBtn').setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  $('meta[name="theme-color"]').content = t === 'dark' ? '#121B1A' : '#FFFFFF';
  if (isOpen('dd-account')) renderAccountDropdown();
  if (ui.route.view === 'settings') refresh();
}
function applySettings() { document.body.classList.toggle('reduce-motion', !!settings.reduceMotion); }

/* ---------- 4. Components ---------- */
function avatar(u, size = 40, { status = false } = {}) {
  return `<span class="avatar" style="--size:${size}px;--a1:${u.colors[0]};--a2:${u.colors[1]}" aria-hidden="true">${u.photo ? `<img src="${u.photo}" alt="">` : `<span>${esc(initials(u.name))}</span>`}${status && isOnline(u) ? '<i class="status-dot"></i>' : ''}</span>`;
}
function avatarLink(u, size = 40, { status = false, tab = true } = {}) {
  return `<a class="avatar-link" href="#/profile/${u.id}" aria-label="${esc(u.name)}"${tab ? '' : ' tabindex="-1"'}>${avatar(u, size, { status })}</a>`;
}
function formatText(text) {
  return esc(text)
    .replace(/(^|\s)#([\p{L}\p{N}_]+)/gu, (m, sp, tag) => `${sp}<a class="hashtag" href="#/search/${encodeURIComponent('#' + tag)}">#${tag}</a>`)
    .replace(/\n/g, '<br>');
}
function emptyHTML({ icon: ic = 'info', title, text = '', action, compact = false }) {
  const btn = action ? (action.href ? `<a class="btn btn--primary" href="${action.href}">${esc(action.label)}</a>` : `<button class="btn btn--primary" type="button" data-action="${action.action}">${esc(action.label)}</button>`) : '';
  return `<div class="empty${compact ? ' empty--compact' : ''}"><div class="empty__icon">${icon(ic)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${btn}</div>`;
}
const skeletonPost = () => `<div class="card post edge skel-post" aria-hidden="true"><div class="skel-row"><span class="skel skel--circle"></span><div class="skel-lines"><span class="skel" style="width:42%"></span><span class="skel" style="width:24%"></span></div></div><span class="skel" style="width:94%"></span><span class="skel" style="width:68%"></span><span class="skel skel--media"></span></div>`;
const skeletonStories = () => Array.from({ length: 5 }, () => '<span class="story skel" aria-hidden="true"></span>').join('');

/* Posts */
function postHeadHTML(p, nested = false) {
  const u = getUser(p.userId), pr = PRIVACY[p.privacy] || PRIVACY.public;
  return `<header class="post__head">
    ${avatarLink(u, nested ? 36 : 42, { tab: false })}
    <div class="post__meta">
      <div><a class="post__author" href="#/profile/${u.id}">${esc(u.name)}</a>${p.feeling ? ` <span class="post__feeling">is feeling ${esc(p.feeling)}</span>` : ''}</div>
      <div class="post__sub">
        <a class="post__time" href="#/post/${p.id}"><time datetime="${new Date(p.time).toISOString()}" title="${esc(fullDate(p.time))}">${timeAgo(p.time, true)}</time></a>
        ${p.location ? `<span class="post__loc">${icon('pin', 'icon--xs')}${esc(p.location)}</span>` : ''}
        <span class="post__privacy" title="${pr.label}">${icon(pr.icon, 'icon--xs')}<span class="sr-only">${pr.label}</span></span>
      </div>
    </div>
    ${nested ? '' : `<button class="icon-btn post__more" type="button" data-action="post-menu" data-post="${p.id}" aria-label="Post options" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>`}
  </header>`;
}
function videoHTML(p) {
  const st = ui.videos.get(p.id) || { t: 0, playing: false }, dur = p.video.duration;
  return `<div class="video${st.playing ? ' is-playing' : ''}" data-video="${p.id}">
    <img src="${p.video.poster}" alt="" loading="lazy" decoding="async">
    <div class="video__shade"></div>
    <span class="video__badge">${icon('video', 'icon--xs')} ${esc(p.video.title)}</span>
    <button class="video__play" type="button" data-action="play-video" data-post="${p.id}" aria-label="Play video">${icon('play')}</button>
    <div class="video__bar">
      <button class="video__toggle" type="button" data-action="play-video" data-post="${p.id}" aria-label="${st.playing ? 'Pause' : 'Play'}">${icon(st.playing ? 'pause' : 'play', 'icon--sm')}</button>
      <div class="video__track" data-action="seek-video" data-post="${p.id}" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${dur}" aria-valuenow="${Math.round(st.t)}"><i style="width:${(st.t / dur) * 100}%"></i></div>
      <span class="video__time">${mmss(st.t)} / ${mmss(dur)}</span>
    </div>
  </div>`;
}
function pollHTML(p, animate = false) {
  const poll = p.poll, total = poll.options.reduce((a, o) => a + o.votes, 0), voted = poll.myVote;
  return `<div class="poll" data-poll="${p.id}" role="group" aria-label="Poll">
    ${poll.options.map(o => {
      const pct = total ? Math.round((o.votes / total) * 100) : 0, mine = voted === o.id;
      return `<button class="poll__opt${mine ? ' is-mine' : ''}" type="button" data-action="vote" data-post="${p.id}" data-option="${o.id}" aria-pressed="${mine}">
        <span class="poll__fill" data-pct="${voted ? pct : 0}" style="width:${voted && !animate ? pct : 0}%"></span>
        <span class="poll__label">${mine ? icon('check') : ''}${esc(o.text)}</span>
        ${voted ? `<span class="poll__pct">${pct}%</span>` : ''}
      </button>`;
    }).join('')}
    <p class="poll__meta"><span>${plural(total, 'vote')}</span>${poll.endsIn ? `<span>Ends in ${esc(poll.endsIn)}</span>` : ''}${voted ? '<button class="link" type="button" data-action="unvote" data-post="' + p.id + '">Remove my vote</button>' : ''}</p>
  </div>`;
}
function mediaHTML(p) {
  if (p.type === 'image' || p.type === 'images') {
    const n = p.images.length, shown = p.images.slice(0, 4);
    const cls = n === 1 ? 'media--single' : `grid grid--${Math.min(n, 4)}`;
    return `<div class="post__media ${cls}">${shown.map((im, i) => `<button class="media-btn" type="button" data-action="open-lightbox" data-post="${p.id}" data-index="${i}" aria-label="Open photo ${i + 1} of ${n}"><img src="${im.src}" alt="${esc(im.alt || '')}" loading="lazy" decoding="async">${i === 3 && n > 4 ? `<span class="media-more">+${n - 4}</span>` : ''}</button>`).join('')}</div>`;
  }
  if (p.type === 'video') return videoHTML(p);
  if (p.type === 'poll') return pollHTML(p);
  if (p.type === 'shared') {
    const o = getPost(p.sharedId);
    return `<div class="shared">${o ? `${postHeadHTML(o, true)}${o.text ? `<div class="post__text shared__text">${formatText(o.text)}</div>` : ''}${mediaHTML(o)}` : `<div class="shared__missing">${icon('info')} This post isn't available anymore.</div>`}</div>`;
  }
  return '';
}
function reactionSummary(p) {
  const total = sumReactions(p);
  if (!total) return '<span></span>';
  const top = REACTIONS.filter(r => p.reactions[r.key] > 0).sort((a, b) => p.reactions[b.key] - p.reactions[a.key]).slice(0, 3);
  const label = p.myReaction ? (total === 1 ? 'You' : `You and ${plural(total - 1, 'other')}`) : fmtCount(total);
  return `<button class="react-sum" type="button" data-action="show-reactions" data-post="${p.id}" aria-label="See who reacted (${total})"><span class="react-sum__icons" aria-hidden="true">${top.map(r => `<span>${r.emoji}</span>`).join('')}</span><span>${label}</span></button>`;
}
function footerHTML(p, pop = false) {
  const r = REACTIONS.find(x => x.key === p.myReaction), saved = ui.saved.has(p.id), n = p.comments.length;
  return `<div class="post__stats">${reactionSummary(p)}<div class="post__counts">${n ? `<button type="button" data-action="toggle-comments" data-post="${p.id}">${plural(n, 'comment')}</button>` : ''}${p.shares ? `<span>${plural(p.shares, 'share')}</span>` : ''}${p.views ? `<span>${p.views} views</span>` : ''}</div></div>
  <div class="post__actions">
    <div class="react">
      <button class="post-action${r ? ' is-active' : ''}" type="button" data-action="react" data-post="${p.id}" aria-pressed="${!!r}"${r ? ` style="--rc:${r.color}"` : ''}>${r ? `<span class="emoji${pop ? ' pop' : ''}" aria-hidden="true">${r.emoji}</span>` : icon('thumb')}<span>${r ? r.label : 'Like'}</span></button>
      <div class="react__picker" role="group" aria-label="Choose a reaction">${REACTIONS.map(x => `<button class="react__opt" type="button" data-action="react" data-post="${p.id}" data-reaction="${x.key}" aria-label="${x.label}" data-label="${x.label}"><span aria-hidden="true">${x.emoji}</span></button>`).join('')}</div>
    </div>
    <button class="post-action" type="button" data-action="focus-comment" data-post="${p.id}">${icon('comment')}<span>Comment</span></button>
    <button class="post-action" type="button" data-action="share" data-post="${p.id}">${icon('share')}<span>Share</span></button>
    <button class="post-action${saved ? ' is-saved' : ''}" type="button" data-action="save" data-post="${p.id}" aria-pressed="${saved}">${icon('bookmark')}<span>${saved ? 'Saved' : 'Save'}</span></button>
  </div>`;
}
function commentHTML(p, c, isNew = false) {
  const u = getUser(c.userId);
  return `<li class="comment${isNew ? ' is-new' : ''}" id="cm-${c.id}">
    ${avatarLink(u, 32, { tab: false })}
    <div class="comment__main">
      <div class="comment__bubble"><a href="#/profile/${u.id}">${esc(u.name)}</a><p>${formatText(c.text)}</p>${c.likes ? `<span class="comment__likes">👍 ${c.likes}</span>` : ''}</div>
      <div class="comment__meta"><time datetime="${new Date(c.time).toISOString()}">${timeAgo(c.time)}</time>
        <button type="button" class="${c.liked ? 'is-active' : ''}" data-action="like-comment" data-post="${p.id}" data-comment="${c.id}" aria-pressed="${c.liked}">Like</button>
        <button type="button" data-action="reply-comment" data-post="${p.id}" data-comment="${c.id}">Reply</button>
        ${c.userId === ME ? `<button type="button" data-action="delete-comment" data-post="${p.id}" data-comment="${c.id}">Delete</button>` : ''}
      </div>
    </div>
  </li>`;
}
function commentsHTML(p, newId) {
  const all = p.comments, expanded = ui.expanded.has(p.id), list = expanded ? all : all.slice(-2), hidden = all.length - list.length;
  return `${hidden > 0 ? `<button class="comments__more" type="button" data-action="toggle-comments" data-post="${p.id}">View ${hidden} more comment${hidden > 1 ? 's' : ''}</button>` : ''}
    <ul class="comment-list">${list.map(c => commentHTML(p, c, c.id === newId)).join('')}</ul>
    <form class="comment-form" data-form="comment" data-post="${p.id}">${avatar(me(), 32)}<div class="comment-form__field"><input name="text" type="text" placeholder="Write a comment…" autocomplete="off" maxlength="1000" aria-label="Write a comment"><button class="comment-form__send" type="submit" aria-label="Post comment">${icon('send', 'icon--sm')}</button></div></form>`;
}
function postHTML(p, { isNew = false } = {}) {
  const big = p.type === 'text' && p.text.length < 90 && !p.text.includes('\n');
  return `<article class="card post edge${isNew ? ' post--new' : ''}" data-post-id="${p.id}" aria-label="Post by ${esc(getUser(p.userId).name)}">
    ${postHeadHTML(p)}
    ${p.text ? `<div class="post__text${big ? ' post__text--big' : ''}">${formatText(p.text)}</div>` : ''}
    ${mediaHTML(p)}
    <div class="post__footer">${footerHTML(p)}</div>
    <section class="comments" aria-label="Comments">${commentsHTML(p)}</section>
  </article>`;
}
const postEls = id => $$(`[data-post-id="${id}"]`);
function refreshFooter(p, pop = false) {
  postEls(p.id).forEach(el => {
    const f = $('.post__footer', el);
    if (!f) return;
    const hadFocus = f.contains(document.activeElement);
    f.innerHTML = footerHTML(p, pop);
    if (pop) {
      const r = $('.react', f);
      r.classList.add('is-cooling');
      const cool = () => r.classList.remove('is-cooling');
      r.addEventListener('mouseleave', cool, { once: true });
      setTimeout(() => r.addEventListener('focusout', cool, { once: true }), 50);
    }
    if (hadFocus) $('.post-action', f).focus({ preventScroll: true });
  });
}
function refreshComments(p, { focus = false, newId } = {}) {
  postEls(p.id).forEach(el => {
    const box = $('.comments', el);
    if (!box) return;
    const input = $('input', box), val = input?.value || '', had = focus || (input && document.activeElement === input);
    box.innerHTML = commentsHTML(p, newId);
    const ni = $('input', box);
    ni.value = focus ? '' : val;
    if (had) ni.focus({ preventScroll: true });
  });
}

/* Stories */
const storyList = () => (ui.myStory ? [ui.myStory, ...stories] : stories.slice());
function storiesHTML() {
  const m = me();
  const create = `<button class="story story--create" type="button" data-action="add-story" aria-label="Create a story">
    <span class="story--create__top" style="--a1:${m.colors[0]};--a2:${m.colors[1]}">${m.photo ? `<img class="story__bg" src="${m.photo}" alt="">` : `<span class="story__initials">${esc(initials(m.name))}</span>`}</span>
    <span class="story--create__plus">${icon('plus', 'icon--sm')}</span><span class="story--create__label">Create story</span></button>`;
  return create + storyList().map((s, i) => {
    const u = getUser(s.userId), first = s.slides[0], mine = u.id === ME;
    return `<button class="story${s.seen ? ' is-seen' : ''}" type="button" data-action="open-story" data-index="${i}" aria-label="View ${mine ? 'your' : esc(u.name) + '’s'} story${s.seen ? '' : ', new'}">
      ${first.type === 'image' ? `<img class="story__bg" src="${first.src}" alt="" loading="lazy">` : `<span class="story__bg story__bg--text" style="background:${first.bg}"><span>${esc(truncate(first.text, 60))}</span></span>`}
      <span class="story__ring ring${s.seen ? ' ring--seen' : ''}">${avatar(u, 36)}</span>
      <span class="story__name">${mine ? 'Your story' : esc(u.name)}</span></button>`;
  }).join('');
}
const refreshStories = () => { const t = $('#storiesTrack'); if (t && ui.feedLoaded) t.innerHTML = storiesHTML(); };

function composerHTML() {
  const m = me();
  return `<section class="card composer edge" aria-label="Create a post">
    <div class="composer__row">${avatarLink(m, 42, { tab: false })}<button class="composer__trigger" type="button" data-action="open-composer">What's on your mind, ${esc(firstName(m))}?</button></div>
    <div class="composer__actions">
      <button class="composer__action" type="button" data-action="open-composer" data-mode="photo" style="--c:#16A34A">${icon('image')}<span>Photo</span></button>
      <button class="composer__action" type="button" data-action="open-composer" data-mode="poll" style="--c:#E8912D">${icon('poll')}<span>Poll</span></button>
      <button class="composer__action" type="button" data-action="open-composer" data-mode="feeling" style="--c:#E11D48">${icon('smile')}<span>Feeling</span></button>
    </div>
  </section>`;
}

function relationButtons(u, size = '') {
  switch (relationOf(u.id)) {
    case 'friend': return `<button class="btn ${size}" type="button" data-action="friend-menu" data-user="${u.id}" aria-haspopup="menu" aria-expanded="false">${icon('user-check')}<span>Friends</span></button>`;
    case 'incoming': return `<button class="btn btn--primary ${size}" type="button" data-action="accept-request" data-user="${u.id}">${icon('user-check')}<span>Confirm</span></button><button class="btn ${size}" type="button" data-action="decline-request" data-user="${u.id}">Delete</button>`;
    case 'outgoing': return `<button class="btn btn--soft ${size}" type="button" data-action="cancel-request" data-user="${u.id}">${icon('user-minus')}<span>Cancel request</span></button>`;
    case 'me': return '';
    default: return `<button class="btn btn--primary ${size}" type="button" data-action="add-friend" data-user="${u.id}">${icon('user-plus')}<span>Add friend</span></button>`;
  }
}
function personRowHTML(u, actions) {
  return `<li class="person-row">${avatarLink(u, 44, { status: true, tab: false })}<div class="person-row__main"><a class="person-row__name" href="#/profile/${u.id}">${esc(u.name)}</a><span class="muted small">${esc(relLabel(u))}</span></div><div class="person-row__actions">${actions ?? relationButtons(u, 'btn--sm')}</div></li>`;
}
function personCardHTML(u, actions) {
  const n = mutualFriends(u).length;
  return `<article class="card person-card" data-name="${esc(normalize(u.name))}">
    <a class="person-card__top" href="#/profile/${u.id}" tabindex="-1" aria-hidden="true"><img src="${u.cover}" alt="" loading="lazy"></a>
    <div class="person-card__avatar">${avatar(u, 80, { status: true })}</div>
    <div class="person-card__body"><a class="person-card__name" href="#/profile/${u.id}">${esc(u.name)}</a><span class="muted small">${n ? `${n} mutual friend${n > 1 ? 's' : ''}` : esc(u.location || '')}</span>
      <div class="person-card__actions">${actions}</div></div>
  </article>`;
}

const NOTIF_TYPES = {
  reaction: { icon: 'heart', color: '#E5484D' }, comment: { icon: 'comment', color: '#0F766E' },
  friend_request: { icon: 'user-plus', color: '#0EA5E9' }, friend_accept: { icon: 'user-check', color: '#0EA5E9' },
  follow: { icon: 'users', color: '#8B5CF6' }, message: { icon: 'chat', color: '#0F766E' },
  event: { icon: 'calendar', color: '#E8912D' }, group: { icon: 'group', color: '#16A34A' }, birthday: { icon: 'gift', color: '#E8912D' },
};
function notifHTML(n) {
  const u = getUser(n.userId), t = NOTIF_TYPES[n.type] || NOTIF_TYPES.reaction;
  const pending = n.type === 'friend_request' && rel.requestsIn.includes(n.userId);
  return `<div class="notif${n.read ? '' : ' is-unread'}">
    <span class="notif__avatar">${avatar(u, 52)}<span class="notif__type" style="--t:${t.color}">${icon(t.icon, 'icon--xs')}</span></span>
    <div class="notif__main"><p class="notif__text"><strong>${esc(u.name)}</strong> ${esc(n.text)}</p><span class="notif__time">${timeAgo(n.time, true)}</span>
      ${pending ? `<div class="notif__actions"><button class="btn btn--primary btn--sm" type="button" data-action="accept-request" data-user="${u.id}">Confirm</button><button class="btn btn--sm" type="button" data-action="decline-request" data-user="${u.id}">Delete</button></div>` : ''}
    </div>
    <a class="notif__link" href="${n.link}" data-action="open-notif" data-id="${n.id}" aria-label="${esc(`${u.name} ${n.text}. ${timeAgo(n.time, true)}${n.read ? '' : '. Unread'}`)}"></a>
  </div>`;
}
const filteredNotifs = () => notifications.filter(n => ui.notifFilter === 'all' || !n.read).sort((a, b) => b.time - a.time);
function notifFilterChips() {
  return `<div class="chips chips--sm" role="group" aria-label="Filter notifications">${['all', 'unread'].map(f => `<button class="chip" type="button" data-action="notif-filter" data-filter="${f}" aria-pressed="${ui.notifFilter === f}">${cap(f)}</button>`).join('')}</div>`;
}
function notifListHTML(limit) {
  const list = filteredNotifs();
  if (!list.length) return emptyHTML({ icon: 'bell', title: "You're all caught up", text: 'New activity on your posts and requests will show up here.', compact: true });
  return `<div class="notif-list">${(limit ? list.slice(0, limit) : list).map(notifHTML).join('')}</div>`;
}
function renderNotifDropdown() {
  $('#dd-notifs').innerHTML = `<div class="dropdown__head"><h2>Notifications</h2><button class="link small" type="button" data-action="mark-all-read">Mark all as read</button></div>${notifFilterChips()}${notifListHTML(8)}<div class="dropdown__foot"><a class="btn btn--ghost btn--block" href="#/notifications">See all notifications</a></div>`;
}
function renderAccountDropdown() {
  const m = me(), dark = isDark();
  $('#dd-account').innerHTML = `<a class="account-card" href="#/profile/${ME}">${avatar(m, 48, { status: true })}<div><strong>${esc(m.name)}</strong><span class="muted small">See your profile</span></div></a>
    <a class="menu__item" href="#/settings">${icon('settings')}<span class="menu__label">Settings & privacy</span></a>
    <button class="menu__item" type="button" data-action="toggle-theme" role="switch" aria-checked="${dark}">${icon(dark ? 'sun' : 'moon')}<span class="menu__label">Dark mode</span><span class="switch switch--mini" aria-hidden="true"></span></button>
    <a class="menu__item" href="#/saved">${icon('bookmark')}<span class="menu__label">Saved</span></a>
    <button class="menu__item" type="button" data-action="shortcuts">${icon('info')}<span class="menu__label">Keyboard shortcuts</span></button>
    <div class="menu-sep"></div>
    <button class="menu__item" type="button" data-action="logout">${icon('logout')}<span class="menu__label">Log out</span></button>`;
}

/* Chrome: sidebars, badges, nav state */
const SIDE_LINKS = [
  { nav: 'feed', icon: 'home', label: 'Home', tint: '#0F766E' },
  { nav: 'friends', icon: 'users', label: 'Friends', tint: '#0EA5E9', badge: 'requests' },
  { nav: 'groups', icon: 'group', label: 'Groups', tint: '#16A34A' },
  { nav: 'messages', icon: 'chat', label: 'Messages', tint: '#14B8A6', badge: 'messages' },
  { nav: 'saved', icon: 'bookmark', label: 'Saved', tint: '#8B5CF6' },
  { nav: 'memories', icon: 'clock', label: 'Memories', tint: '#E8912D' },
  { nav: 'events', icon: 'calendar', label: 'Events', tint: '#E11D48' },
  { nav: 'settings', icon: 'settings', label: 'Settings', tint: '#64748B' },
];
function renderLeftSidebar() {
  const m = me();
  $('#sidebarLeft').innerHTML = `<div class="drawer-head"><span class="brand">${$('.brand__mark').outerHTML}<span class="brand__name">Connect</span></span><button class="icon-btn" type="button" data-action="close-drawer" aria-label="Close menu">${icon('x')}</button></div>
    <nav class="side-nav" aria-label="Main">
      <a class="side-link side-link--me" href="#/profile/${ME}" data-nav="profile">${avatar(m, 38, { status: true })}<span class="side-link__text">${esc(m.name)}</span></a>
      ${SIDE_LINKS.map(l => `<a class="side-link" href="#/${l.nav}" data-nav="${l.nav}" style="--tint:${l.tint}"><span class="side-link__icon">${icon(l.icon)}</span><span class="side-link__text">${l.label}</span>${l.badge ? `<span class="count" data-badge="${l.badge}" hidden></span>` : ''}</a>`).join('')}
    </nav>
    <section class="side-section" aria-label="Your groups"><h2 class="side-section__title">Your groups</h2>
      ${groups.filter(g => g.joined).map(g => `<button class="side-link" type="button" data-action="open-group" data-group="${g.id}"><img class="side-link__thumb" src="${g.cover}" alt=""><span class="side-link__text">${esc(g.name)}</span></button>`).join('') || '<p class="muted small" style="padding:0 10px">Join a group to see it here.</p>'}
    </section>
    <p class="side-footer">Connect © 2026 · Prototype build</p>`;
}
function renderRightSidebar() {
  const contacts = [...rel.friends].map(getUser).sort((a, b) => isOnline(b) - isOnline(a) || a.name.localeCompare(b.name));
  const onlineN = contacts.filter(isOnline).length;
  const sugg = suggestions().slice(0, 3);
  const upcoming = events.filter(e => e.date > Date.now()).sort((a, b) => a.date - b.date).slice(0, 2);
  const bday = users.find(u => u.birthday && rel.friends.has(u.id));
  $('#sidebarRight').innerHTML = `
    ${bday ? `<section class="card widget"><div class="birthday"><span class="birthday__icon">${icon('gift')}</span><p><strong>${esc(bday.name)}</strong> has a birthday today.</p><button class="btn btn--soft btn--sm" type="button" data-action="send-wish" data-user="${bday.id}">Send wish</button></div></section>` : ''}
    <section class="card widget" aria-label="Contacts"><header class="widget__head"><h2 class="widget__title">Contacts</h2><span class="muted small">${onlineN} online</span></header>
      <ul class="contact-list">${contacts.map(u => `<li><button class="contact" type="button" data-action="message-user" data-user="${u.id}" aria-label="Message ${esc(u.name)}, ${esc(presence(u))}">${avatar(u, 36, { status: true })}<span class="contact__name">${esc(u.name)}</span>${!isOnline(u) && u.lastSeen ? `<span class="contact__seen">${timeAgo(u.lastSeen)}</span>` : ''}</button></li>`).join('')}</ul></section>
    ${sugg.length ? `<section class="card widget" aria-label="People you may know"><header class="widget__head"><h2 class="widget__title">People you may know</h2><a class="link small" href="#/friends/suggestions">See all</a></header>
      <ul class="plain-list">${sugg.map(u => personRowHTML(u, `${relationOf(u.id) === 'outgoing' ? `<button class="btn btn--soft btn--sm" type="button" data-action="cancel-request" data-user="${u.id}">Requested</button>` : `<button class="btn btn--primary btn--sm btn--icon" type="button" data-action="add-friend" data-user="${u.id}" aria-label="Add ${esc(u.name)} as a friend">${icon('user-plus', 'icon--sm')}</button>`}<button class="btn btn--sm btn--icon btn--ghost" type="button" data-action="dismiss-suggestion" data-user="${u.id}" aria-label="Remove suggestion">${icon('x', 'icon--sm')}</button>`)).join('')}</ul></section>` : ''}
    <section class="card widget" aria-label="Trending"><header class="widget__head"><h2 class="widget__title">Trending in Việt Nam</h2></header>
      <ol class="plain-list">${trends.map((t, i) => `<li><a class="trend" href="#/search/${encodeURIComponent('#' + t.tag)}"><span class="trend__rank">${i + 1}</span><span><span class="trend__tag">#${t.tag}</span><span class="trend__meta">${fmtCount(t.count)} posts</span></span></a></li>`).join('')}</ol></section>
    <section class="card widget" aria-label="Upcoming events"><header class="widget__head"><h2 class="widget__title">Upcoming events</h2><a class="link small" href="#/events">See all</a></header>
      <ul class="plain-list">${upcoming.map(e => { const d = new Date(e.date); return `<li><a class="event-mini" href="#/events"><span class="date-badge"><span>${d.toLocaleDateString('en-GB', { month: 'short' })}</span><strong>${d.getDate()}</strong></span><span><span class="event-mini__title">${esc(e.title)}</span><span class="muted small" style="display:block">${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${clock(e.date)}, ${esc(e.place.split(',')[0])}</span></span></a></li>`; }).join('')}</ul></section>`;
}
function updateBadges() {
  const counts = { notifs: notifications.filter(n => !n.read).length, messages: conversations.filter(c => c.unread > 0).length, requests: rel.requestsIn.length };
  $$('[data-badge]').forEach(b => { const n = counts[b.dataset.badge] || 0; b.textContent = n > 99 ? '99+' : n; b.hidden = !n; });
  const total = counts.notifs + counts.messages;
  document.title = `${total ? `(${total}) ` : ''}${ui.title} · Connect`;
}
function bumpBadge(key) { $$(`[data-badge="${key}"]`).forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }
function setTitle(t) { ui.title = t; updateBadges(); }
function setActiveNav(key) {
  $$('[data-nav]').forEach(el => {
    const on = el.dataset.nav === key;
    el.classList.toggle('is-active', on);
    if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
}
const navKey = () => { const { view, param } = ui.route; return view === 'profile' ? (!param || param === ME ? 'profile' : '') : view; };
function renderChrome() {
  $('#navAvatar').innerHTML = avatar(me(), 38, { status: true });
  renderLeftSidebar();
  renderRightSidebar();
  updateBadges();
  setActiveNav(navKey());
}

/* Highlight search matches inside rendered text (accent-insensitive). */
function highlight(root, q) {
  const needle = [...normalize(q.trim())];
  if (!needle.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const chars = [...node.nodeValue], norm = chars.map(c => [...normalize(c)]);
    if (norm.some(a => a.length !== 1)) return;
    const flat = norm.map(a => a[0]), hits = [];
    for (let i = 0; i <= flat.length - needle.length; i++) {
      if (needle.every((c, k) => flat[i + k] === c)) { hits.push(i); i += needle.length - 1; }
    }
    if (!hits.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    hits.forEach(i => {
      frag.append(chars.slice(last, i).join(''));
      const mk = document.createElement('mark');
      mk.textContent = chars.slice(i, i + needle.length).join('');
      frag.append(mk);
      last = i + needle.length;
    });
    frag.append(chars.slice(last).join(''));
    node.replaceWith(frag);
  });
}

/* ---------- 5. Views & router ---------- */
const WIDE = new Set(['profile', 'messages', 'friends', 'groups', 'events']);
const FEED_FILTERS = [
  { key: 'all', label: 'All posts' }, { key: 'friends', label: 'Friends' }, { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' }, { key: 'polls', label: 'Polls' }, { key: 'mine', label: 'My posts' },
];

function parseRoute() {
  const [view = 'feed', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  const param = rest.length && rest[0] !== '' ? decodeURIComponent(rest.join('/')) : null;
  return { view: views[view] ? view : 'feed', param };
}
function render({ keepScroll = false } = {}) {
  const prev = ui.route, route = parseRoute(), y = scrollY;
  ui.route = route;
  stopVideos(); closeMenu();
  if (!keepScroll) { closeDropdowns(); closeDrawer(); closeSearch(); }
  [...document.body.classList].filter(c => c.startsWith('view-')).forEach(c => document.body.classList.remove(c));
  document.body.classList.add(`view-${route.view}`);
  document.body.classList.toggle('is-wide', WIDE.has(route.view));
  views[route.view](route.param);
  setActiveNav(navKey());
  window.scrollTo(0, keepScroll ? y : 0);
  if (!keepScroll && prev.view !== route.view && document.activeElement === document.body) main.focus({ preventScroll: true });
}
const refresh = () => render({ keepScroll: true });
window.addEventListener('hashchange', () => render());

/* Feed */
function feedPosts() {
  return posts
    .filter(p => !ui.hidden.has(p.id) && (p.userId === ME || rel.friends.has(p.userId) || rel.following.has(p.userId)))
    .filter(p => {
      switch (ui.feedFilter) {
        case 'friends': return rel.friends.has(p.userId);
        case 'photos': return p.type === 'image' || p.type === 'images';
        case 'videos': return p.type === 'video';
        case 'polls': return p.type === 'poll';
        case 'mine': return p.userId === ME;
        default: return true;
      }
    })
    .sort((a, b) => b.time - a.time);
}
function feedListHTML(newId) {
  const list = feedPosts();
  if (!list.length) return `<div class="card edge">${emptyHTML({ icon: 'image', title: 'No posts match this filter', text: 'Try another filter, or share something yourself.', action: { label: 'Create post', action: 'open-composer' } })}</div>`;
  return list.map(p => postHTML(p, { isNew: p.id === newId })).join('') + `<p class="feed-end">${icon('check')} You're all caught up</p>`;
}
function viewFeed() {
  setTitle('Home');
  const newId = ui.pendingNew; ui.pendingNew = null;
  main.innerHTML = `<h1 class="sr-only">Home feed</h1>
    <section class="card stories edge" aria-label="Stories">
      <div class="stories__track" id="storiesTrack">${ui.feedLoaded ? storiesHTML() : skeletonStories()}</div>
      <button class="stories__nav stories__nav--prev" type="button" data-action="scroll-stories" data-dir="-1" aria-label="Scroll stories left">${icon('chev-left')}</button>
      <button class="stories__nav stories__nav--next" type="button" data-action="scroll-stories" data-dir="1" aria-label="Scroll stories right">${icon('chev-right')}</button>
    </section>
    ${composerHTML()}
    <div class="chips feed-chips" role="group" aria-label="Filter feed">${FEED_FILTERS.map(f => `<button class="chip" type="button" data-action="feed-filter" data-filter="${f.key}" aria-pressed="${ui.feedFilter === f.key}">${f.label}</button>`).join('')}</div>
    <div class="feed" id="feedList" aria-busy="${!ui.feedLoaded}">${ui.feedLoaded ? feedListHTML(newId) : skeletonPost() + skeletonPost()}</div>`;
  if (!ui.feedLoaded) {
    setTimeout(() => {
      ui.feedLoaded = true;
      if (ui.route.view !== 'feed') return;
      refreshStories();
      const list = $('#feedList');
      list.innerHTML = feedListHTML();
      list.setAttribute('aria-busy', 'false');
    }, 700);
  }
}

function viewPost(id) {
  const p = getPost(id);
  setTitle('Post');
  if (p) ui.expanded.add(p.id);
  main.innerHTML = `<button class="back-link" type="button" data-action="go-back">${icon('arrow-left', 'icon--sm')} Back</button>
    ${p ? postHTML(p) : `<div class="card">${emptyHTML({ icon: 'info', title: "This post isn't available", text: 'It may have been deleted, or the link is incorrect.', action: { label: 'Go to your feed', href: '#/feed' } })}</div>`}`;
}

/* Profile */
function photosOf(u) {
  const list = [...posts, ...memories].filter(p => p.userId === u.id && p.images).sort((a, b) => b.time - a.time).flatMap(p => p.images);
  return [...list, { src: u.cover, alt: `${u.name}'s cover photo` }].filter((v, i, a) => a.findIndex(x => x.src === v.src) === i);
}
function viewProfile(id) {
  const u = getUser(id || ME) || me(), own = u.id === ME;
  if (ui.profileId !== u.id) { ui.profileId = u.id; ui.profileTab = 'posts'; }
  setTitle(u.name);
  const count = posts.filter(p => p.userId === u.id).length, mutual = mutualFriends(u), following = rel.following.has(u.id);
  main.innerHTML = `<section class="card profile edge">
    <div class="profile__cover"><img src="${u.cover}" alt="">${own ? `<button class="btn btn--sm btn--glass" type="button" data-action="change-cover">${icon('camera')}<span>Edit cover</span></button>` : ''}</div>
    <div class="profile__head">
      <div class="profile__avatar">${avatar(u, 164)}${own ? `<button class="icon-btn" type="button" data-action="change-avatar" aria-label="Change profile picture">${icon('camera', 'icon--sm')}</button>` : ''}</div>
      <div class="profile__info">
        <h1>${esc(u.name)}</h1>
        <p class="profile__handle">@${esc(u.handle)}</p>
        ${u.bio ? `<p class="profile__bio">${esc(u.bio)}</p>` : ''}
        <ul class="profile__stats">
          <li><strong>${count}</strong> posts</li>
          <li><button type="button" data-action="profile-tab" data-tab="friends"><strong>${fmtCount(friendCount(u))}</strong> friends</button></li>
          <li><strong>${fmtCount(u.followers)}</strong> followers</li>
          <li><strong>${fmtCount(u.following)}</strong> following</li>
        </ul>
        ${!own && mutual.length ? `<div class="profile__mutual"><span class="avatar-stack">${mutual.slice(0, 4).map(f => avatar(f, 26)).join('')}</span>${mutual.length} mutual friend${mutual.length > 1 ? 's' : ''}, including ${esc(mutual[0].name)}</div>` : ''}
      </div>
      <div class="profile__actions">${own
        ? `<button class="btn btn--primary" type="button" data-action="edit-profile">${icon('edit')}<span>Edit profile</span></button><button class="btn" type="button" data-action="add-story">${icon('plus')}<span>Add to story</span></button>`
        : `${relationButtons(u)}<button class="btn" type="button" data-action="message-user" data-user="${u.id}">${icon('chat')}<span>Message</span></button><button class="btn${following ? ' btn--soft' : ''}" type="button" data-action="follow" data-user="${u.id}" aria-pressed="${following}">${following ? 'Following' : 'Follow'}</button>`}</div>
    </div>
    <nav class="tabs" role="tablist" aria-label="Profile sections">${['posts', 'about', 'friends', 'photos'].map(t => `<button class="tab${ui.profileTab === t ? ' is-active' : ''}" type="button" role="tab" id="tab-${t}" aria-selected="${ui.profileTab === t}" aria-controls="profileTab" data-action="profile-tab" data-tab="${t}">${cap(t)}</button>`).join('')}</nav>
  </section>
  <div class="profile-body" id="profileTab" role="tabpanel"></div>`;
  renderProfileTab(u);
}
function infoItems(u) {
  return [
    u.work && ['briefcase', 'Work', u.work], u.education && ['cap', 'Education', u.education],
    u.location && ['pin', 'Lives in', u.location], u.hometown && ['home', 'From', u.hometown],
    u.website && ['globe', 'Website', u.website], u.relationship && ['heart', 'Relationship', u.relationship],
    u.joined && ['clock', 'Joined', u.joined],
  ].filter(Boolean);
}
function renderProfileTab(u) {
  const own = u.id === ME, box = $('#profileTab'), tab = ui.profileTab;
  box.setAttribute('aria-labelledby', `tab-${tab}`);
  ui.photoList = photosOf(u);
  const photoBtn = (im, i) => `<button class="media-btn" type="button" data-action="open-photo" data-index="${i}" aria-label="Open photo ${i + 1}"><img src="${im.src}" alt="${esc(im.alt || '')}" loading="lazy"></button>`;
  const friends = friendsOf(u.id);
  if (tab === 'posts') {
    const list = posts.filter(p => p.userId === u.id).sort((a, b) => b.time - a.time);
    box.innerHTML = `<div class="profile-grid">
      <aside class="profile-side">
        <section class="card card-pad"><div class="card-head"><h2>Intro</h2></div>
          ${u.bio ? `<p class="intro__bio">${esc(u.bio)}</p>` : ''}
          <ul class="info-list">${infoItems(u).slice(0, 4).map(([ic, , v]) => `<li>${icon(ic, 'icon--sm')}<span>${esc(v)}</span></li>`).join('')}</ul>
          ${own ? '<button class="btn btn--block" type="button" data-action="edit-profile">Edit details</button>' : ''}</section>
        <section class="card card-pad"><div class="card-head"><h2>Photos</h2><button class="link small" type="button" data-action="profile-tab" data-tab="photos">See all</button></div><div class="photo-grid">${ui.photoList.slice(0, 9).map(photoBtn).join('')}</div></section>
        <section class="card card-pad"><div class="card-head"><h2>Friends</h2><button class="link small" type="button" data-action="profile-tab" data-tab="friends">See all</button></div><p class="muted small" style="margin:-8px 0 12px">${fmtCount(friendCount(u))} friends</p>
          <div class="friend-grid">${friends.slice(0, 6).map(f => `<a class="friend-tile" href="#/profile/${f.id}">${avatar(f, 96)}<span>${esc(f.name)}</span></a>`).join('')}</div></section>
      </aside>
      <div class="feed">${own ? composerHTML() : ''}${list.length ? list.map(p => postHTML(p)).join('') : `<div class="card">${emptyHTML({ icon: 'edit', title: 'No posts yet', text: own ? 'Share your first update with friends.' : `${firstName(u)} hasn't posted anything yet.` })}</div>`}</div>
    </div>`;
  } else if (tab === 'about') {
    box.innerHTML = `<section class="card card-pad"><div class="card-head"><h2>About ${esc(firstName(u))}</h2>${own ? `<button class="btn btn--sm" type="button" data-action="edit-profile">${icon('edit')}<span>Edit</span></button>` : ''}</div>
      <dl class="about__list">${[...infoItems(u), ['users', 'Friends', `${fmtCount(friendCount(u))} friends`], ['eye', 'Followers', `${fmtCount(u.followers)} followers`]].map(([ic, l, v]) => `<div class="about__row"><span class="about__icon">${icon(ic)}</span><div><dt>${l}</dt><dd>${esc(v)}</dd></div></div>`).join('')}</dl></section>`;
  } else if (tab === 'friends') {
    box.innerHTML = `<section class="card card-pad"><div class="card-head"><h2>Friends</h2><label class="conv-search" style="margin:0;max-width:260px;flex:1">${icon('search', 'icon--sm')}<input type="search" id="profileFriendSearch" placeholder="Search friends" aria-label="Search friends"></label></div>
      <div class="friend-grid friend-grid--lg" id="profileFriends">${friends.length ? friends.map(f => `<div class="friend-row" data-name="${esc(normalize(f.name))}">${avatarLink(f, 60, { status: true, tab: false })}<div><a class="person-row__name" href="#/profile/${f.id}">${esc(f.name)}</a><span class="muted small">${esc(relLabel(f))}</span></div>${f.id === ME ? '' : `<button class="btn btn--sm btn--icon" type="button" data-action="message-user" data-user="${f.id}" aria-label="Message ${esc(f.name)}">${icon('chat', 'icon--sm')}</button>`}</div>`).join('') : emptyHTML({ icon: 'users', title: 'No friends to show', compact: true })}</div></section>`;
    $('#profileFriendSearch').addEventListener('input', e => {
      const q = normalize(e.target.value.trim());
      $$('#profileFriends .friend-row').forEach(r => { r.hidden = !r.dataset.name.includes(q); });
    });
  } else {
    box.innerHTML = `<section class="card card-pad"><div class="card-head"><h2>Photos</h2><span class="muted small">${ui.photoList.length} photos</span></div><div class="photo-grid photo-grid--lg">${ui.photoList.map(photoBtn).join('')}</div></section>`;
  }
}

/* Friends */
function viewFriends(tab) {
  if (['requests', 'suggestions', 'all'].includes(tab)) ui.friendsTab = tab;
  if (!ui.friendsTab) ui.friendsTab = rel.requestsIn.length ? 'requests' : 'suggestions';
  const t = ui.friendsTab, reqs = rel.requestsIn.map(getUser), sugg = suggestions(), all = [...rel.friends].map(getUser).sort((a, b) => a.name.localeCompare(b.name));
  setTitle('Friends');
  const tabs = [['requests', 'Requests', reqs.length], ['suggestions', 'Suggestions', sugg.length], ['all', 'All friends', all.length]];
  let body;
  if (t === 'requests') {
    body = reqs.length ? `<div class="person-grid">${reqs.map(u => personCardHTML(u, `<button class="btn btn--primary btn--sm" type="button" data-action="accept-request" data-user="${u.id}">Confirm</button><button class="btn btn--sm" type="button" data-action="decline-request" data-user="${u.id}">Delete</button>`)).join('')}</div>`
      : `<div class="card">${emptyHTML({ icon: 'user-check', title: 'No pending requests', text: 'When someone sends you a friend request, it will show up here.', action: { label: 'Find people you may know', href: '#/friends/suggestions' } })}</div>`;
  } else if (t === 'suggestions') {
    body = sugg.length ? `<div class="person-grid">${sugg.map(u => personCardHTML(u, `${relationButtons(u, 'btn--sm')}<button class="btn btn--sm btn--ghost" type="button" data-action="dismiss-suggestion" data-user="${u.id}">Remove</button>`)).join('')}</div>`
      : `<div class="card">${emptyHTML({ icon: 'users', title: 'No new suggestions', text: 'Check back later for people you may know.' })}</div>`;
  } else {
    body = `<label class="conv-search" style="margin:0 0 14px;max-width:360px">${icon('search', 'icon--sm')}<input type="search" id="friendSearch" placeholder="Search your friends" aria-label="Search your friends"></label>
      ${all.length ? `<div class="person-grid" id="friendGrid">${all.map(u => personCardHTML(u, `<button class="btn btn--soft btn--sm" type="button" data-action="message-user" data-user="${u.id}">${icon('chat')}<span>Message</span></button><button class="btn btn--sm btn--icon" type="button" data-action="friend-menu" data-user="${u.id}" aria-label="More options for ${esc(u.name)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>`)).join('')}</div>` : `<div class="card">${emptyHTML({ icon: 'users', title: 'No friends yet', text: 'Add people you know to see their posts and chat with them.', action: { label: 'See suggestions', href: '#/friends/suggestions' } })}</div>`}`;
  }
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Friends</h1><div class="chips" role="group" aria-label="Friends sections">${tabs.map(([k, l, n]) => `<a class="chip" href="#/friends/${k}" aria-pressed="${t === k}">${l}${n ? ` <span class="chip__count">${n}</span>` : ''}</a>`).join('')}</div></header>${body}</div>`;
  $('#friendSearch')?.addEventListener('input', e => {
    const q = normalize(e.target.value.trim());
    $$('#friendGrid .person-card').forEach(c => { c.hidden = !c.dataset.name.includes(q); });
  });
}

/* Groups */
function groupCardHTML(g) {
  return `<article class="card tile"><img class="tile__cover" src="${g.cover}" alt="" loading="lazy"><div class="tile__body">
    <h3 class="tile__title">${esc(g.name)}</h3>
    <p class="meta-line">${icon(g.privacy === 'private' ? 'lock' : 'globe', 'icon--xs')}${g.privacy === 'private' ? 'Private' : 'Public'} group, ${fmtCount(g.members)} members</p>
    <p class="tile__desc">${esc(g.desc)}</p>
    ${g.joined ? `<p class="tile__activity">${icon('trending', 'icon--xs')}${esc(g.activity)}</p>` : ''}
    <div class="tile__actions">${g.joined
      ? `<button class="btn btn--soft" type="button" data-action="open-group" data-group="${g.id}">View group</button>`
      : `<button class="btn btn--primary" type="button" data-action="join-group" data-group="${g.id}">${icon('plus')}<span>Join group</span></button><button class="btn" type="button" data-action="open-group" data-group="${g.id}">Preview</button>`}</div>
  </div></article>`;
}
function viewGroups() {
  setTitle('Groups');
  const mine = groups.filter(g => g.joined), other = groups.filter(g => !g.joined);
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Groups</h1><button class="btn btn--primary" type="button" data-action="create-group">${icon('plus')}<span>Create group</span></button></header>
    <h2 class="section-title">Your groups <span class="muted small">${mine.length}</span></h2>
    ${mine.length ? `<div class="tile-grid">${mine.map(groupCardHTML).join('')}</div>` : `<div class="card">${emptyHTML({ icon: 'group', title: "You haven't joined any groups", text: 'Groups are where people with shared interests talk. Pick one below to get started.', compact: true })}</div>`}
    <h2 class="section-title">Discover</h2>
    ${other.length ? `<div class="tile-grid">${other.map(groupCardHTML).join('')}</div>` : `<div class="card">${emptyHTML({ icon: 'check', title: "You've joined every suggested group", compact: true })}</div>`}
  </div>`;
}

/* Events */
function eventCardHTML(e) {
  const d = new Date(e.date);
  return `<article class="card tile event"><div class="tile__media"><img class="tile__cover" src="${e.cover}" alt="" loading="lazy"><span class="date-chip" aria-hidden="true"><span>${d.toLocaleDateString('en-GB', { month: 'short' })}</span><strong>${d.getDate()}</strong></span></div>
    <div class="tile__body">
      <p class="event__when">${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${clock(e.date)}</p>
      <h3 class="tile__title">${esc(e.title)}</h3>
      <p class="meta-line">${icon('pin', 'icon--xs')}${esc(e.place)}</p>
      <p class="meta-line">${icon('users', 'icon--xs')}${fmtCount(e.going)} going, ${fmtCount(e.interested)} interested</p>
      <div class="tile__actions">
        <button class="btn btn--sm${e.status === 'interested' ? ' is-on' : ''}" type="button" data-action="event-status" data-event="${e.id}" data-status="interested" aria-pressed="${e.status === 'interested'}">${icon('star')}<span>Interested</span></button>
        <button class="btn btn--sm${e.status === 'going' ? ' btn--primary' : ''}" type="button" data-action="event-status" data-event="${e.id}" data-status="going" aria-pressed="${e.status === 'going'}">${icon('check')}<span>Going</span></button>
      </div>
    </div></article>`;
}
function viewEvents() {
  setTitle('Events');
  const t = ui.eventsTab;
  const list = events.filter(e => e.date > Date.now() && (t === 'upcoming' || e.status)).sort((a, b) => a.date - b.date);
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Events</h1><div class="chips" role="group" aria-label="Events filter">${[['upcoming', 'Upcoming'], ['yours', 'Your events']].map(([k, l]) => `<button class="chip" type="button" data-action="events-tab" data-tab="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}</div></header>
    ${list.length ? `<div class="tile-grid">${list.map(eventCardHTML).join('')}</div>` : `<div class="card">${emptyHTML({ icon: 'calendar', title: 'No events on your list', text: 'Mark events as Interested or Going and they will be collected here.', action: { label: 'Browse upcoming events', action: 'events-upcoming' } })}</div>`}
  </div>`;
}

/* Saved, memories, notifications, search, settings */
function viewSaved() {
  setTitle('Saved');
  const list = [...posts, ...memories].filter(p => ui.saved.has(p.id)).sort((a, b) => b.time - a.time);
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Saved</h1><span class="muted">${plural(list.length, 'item')}</span></header>
    ${list.length ? `<div class="feed">${list.map(p => postHTML(p)).join('')}</div>` : `<div class="card">${emptyHTML({ icon: 'bookmark', title: 'Nothing saved yet', text: 'Tap Save on any post to keep it here for later.', action: { label: 'Browse your feed', href: '#/feed' } })}</div>`}</div>`;
}
function viewMemories() {
  setTitle('Memories');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  main.innerHTML = `<div class="page"><section class="card memories-hero"><span class="memories-hero__icon">${icon('clock')}</span><div><h1>On this day, ${today}</h1><p>Look back at moments you shared on Connect in past years.</p></div></section>
    <div class="feed">${memories.map(m => { const years = new Date().getFullYear() - new Date(m.time).getFullYear(); return `<div class="memory"><p class="memory__label">${icon('clock', 'icon--xs')} ${years} years ago today</p>${postHTML(m)}</div>`; }).join('')}</div></div>`;
}
function viewNotifications() {
  setTitle('Notifications');
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Notifications</h1><button class="btn btn--ghost btn--sm" type="button" data-action="mark-all-read">${icon('check')}<span>Mark all as read</span></button></header>
    <div style="margin-bottom:12px">${notifFilterChips()}</div><section class="card notif-page">${notifListHTML()}</section></div>`;
}
function searchResults(q) {
  const nq = normalize(q.trim());
  return {
    people: users.filter(u => u.id !== ME && normalize(`${u.name} ${u.handle} ${u.location || ''}`).includes(nq)),
    groups: groups.filter(g => normalize(`${g.name} ${g.desc}`).includes(nq)),
    posts: [...posts].filter(p => !ui.hidden.has(p.id) && normalize(`${p.text} ${getUser(p.userId).name} ${p.location || ''}`).includes(nq)).sort((a, b) => b.time - a.time),
  };
}
function viewSearch(q = '') {
  q = q || '';
  setTitle(`Search: ${q}`);
  $('#searchInput').value = q;
  const r = searchResults(q), total = r.people.length + r.groups.length + r.posts.length;
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Results for “${esc(q)}”</h1><span class="muted">${plural(total, 'result')}</span></header>
    ${!total ? `<div class="card">${emptyHTML({ icon: 'search', title: 'No results found', text: `Nothing matches “${q}”. Check the spelling or try a shorter word. Accents are optional, so “ca phe” also finds “cà phê”.` })}</div>` : ''}
    ${r.people.length ? `<section class="card card-pad" style="margin-bottom:var(--gap)"><div class="card-head"><h2>People</h2></div><ul class="plain-list" id="searchPeople">${r.people.map(u => personRowHTML(u)).join('')}</ul></section>` : ''}
    ${r.groups.length ? `<section class="card card-pad" style="margin-bottom:var(--gap)"><div class="card-head"><h2>Groups</h2></div><ul class="plain-list">${r.groups.map(g => `<li class="person-row"><img class="sd-thumb" src="${g.cover}" alt="" style="width:44px;height:44px"><div class="person-row__main"><span class="person-row__name">${esc(g.name)}</span><span class="muted small">${fmtCount(g.members)} members</span></div><button class="btn btn--sm" type="button" data-action="open-group" data-group="${g.id}">${g.joined ? 'View' : 'Preview'}</button></li>`).join('')}</ul></section>` : ''}
    ${r.posts.length ? `<h2 class="section-title">Posts</h2><div class="feed" id="searchPosts">${r.posts.map(p => postHTML(p)).join('')}</div>` : ''}
  </div>`;
  $$('#searchPosts .post__text, #searchPeople .person-row__name').forEach(el => highlight(el, q.replace(/^#/, '')));
}
function viewSettings() {
  setTitle('Settings');
  const sw = (key, label) => `<button class="switch" type="button" role="switch" aria-checked="${!!settings[key]}" data-action="toggle-setting" data-key="${key}" aria-label="${label}"></button>`;
  main.innerHTML = `<div class="page"><header class="page-head"><h1>Settings</h1></header>
    <section class="card settings-group"><h2>Appearance</h2>
      <div class="setting"><div><h3>Theme</h3><p>Choose how Connect looks on this device.</p></div><div class="segmented" role="radiogroup" aria-label="Theme">
        <button type="button" role="radio" aria-checked="${!isDark()}" data-action="set-theme" data-theme="light">${icon('sun')}Light</button>
        <button type="button" role="radio" aria-checked="${isDark()}" data-action="set-theme" data-theme="dark">${icon('moon')}Dark</button></div></div>
      <div class="setting"><div><h3>Reduce motion</h3><p>Turn off animations and transitions.</p></div>${sw('reduceMotion', 'Reduce motion')}</div>
    </section>
    <section class="card settings-group"><h2>Privacy</h2>
      <div class="setting"><div><h3>Default audience</h3><p>Who can see your new posts unless you change it.</p></div><select class="input" data-setting="defaultPrivacy" aria-label="Default audience">${Object.entries(PRIVACY).map(([k, v]) => `<option value="${k}"${settings.defaultPrivacy === k ? ' selected' : ''}>${v.label}</option>`).join('')}</select></div>
      <div class="setting"><div><h3>Show active status</h3><p>Friends can see when you're online.</p></div>${sw('activeStatus', 'Show active status')}</div>
    </section>
    <section class="card settings-group"><h2>Notifications</h2>
      <div class="setting"><div><h3>Message previews</h3><p>Show message text in your chat list.</p></div>${sw('previews', 'Message previews')}</div>
      <div class="setting"><div><h3>Sounds</h3><p>Play a soft sound for new messages and notifications.</p></div>${sw('sounds', 'Notification sounds')}</div>
    </section>
    <section class="card settings-group"><h2>Account</h2>
      <div class="setting"><div><h3>Profile</h3><p>Change your name, bio, photos and details.</p></div><button class="btn btn--sm" type="button" data-action="edit-profile">${icon('edit')}<span>Edit profile</span></button></div>
      <div class="setting"><div><h3>Reset demo data</h3><p>Restore all posts, messages and friends to their original state.</p></div><button class="btn btn--sm" type="button" data-action="reset-demo">Reset</button></div>
      <div class="setting"><div><h3>Log out</h3><p>Sign out of Connect on this device.</p></div><button class="btn btn--sm btn--ghost" type="button" data-action="logout">${icon('logout')}<span>Log out</span></button></div>
    </section></div>`;
}

/* Messages */
function viewMessages(convId) {
  setTitle('Messages');
  if (!convId && matchMedia('(min-width: 769px)').matches && conversations.length) {
    convId = sortedConvs()[0].id;
    history.replaceState(null, '', `#/messages/${convId}`);
    ui.route.param = convId;
  }
  const c = convId && getConv(convId);
  main.innerHTML = `<section class="card messenger${c ? ' show-chat' : ''}" aria-label="Messages">
    <div class="messenger__list">
      <header class="messenger__head"><h1>Chats</h1><button class="icon-btn icon-btn--filled" type="button" data-action="new-message" aria-label="New message">${icon('edit', 'icon--sm')}</button></header>
      <label class="conv-search">${icon('search', 'icon--sm')}<input type="search" id="convSearch" placeholder="Search conversations" aria-label="Search conversations" value="${esc(ui.convQuery)}"></label>
      <nav class="conv-list" id="convList" aria-label="Conversations"></nav>
    </div>
    <section class="messenger__chat" id="chatPane" aria-label="Conversation">${c ? '' : `<div class="chat-hello">${emptyHTML({ icon: 'chat', title: 'Pick a conversation', text: 'Choose a chat on the left or start a new one.', action: { label: 'New message', action: 'new-message' } })}</div>`}</section>
  </section>`;
  renderConvList();
  $('#convSearch').addEventListener('input', e => { ui.convQuery = e.target.value; renderConvList(); });
  if (c) renderChat(c);
}
function convPreview(c) {
  if (c.typing) return 'typing…';
  const m = c.messages[c.messages.length - 1];
  if (!m) return 'Say hello 👋';
  if (!settings.previews && c.unread) return 'New message';
  const who = m.from === ME ? 'You: ' : '';
  return who + (m.image ? '📷 Photo' : m.postRef ? 'Shared a post' : m.text);
}
function renderConvList() {
  const el = $('#convList');
  if (!el) return;
  const q = normalize(ui.convQuery.trim());
  const list = sortedConvs().filter(c => !q || normalize(getUser(c.userId).name + ' ' + c.messages.map(m => m.text || '').join(' ')).includes(q));
  el.innerHTML = list.length ? list.map(c => {
    const u = getUser(c.userId), active = ui.route.param === c.id;
    return `<a class="conv${active ? ' is-active' : ''}${c.unread ? ' is-unread' : ''}${c.typing ? ' is-typing' : ''}" href="#/messages/${c.id}"${active ? ' aria-current="true"' : ''}>
      ${avatar(u, 52, { status: true })}
      <div class="conv__body"><div class="conv__top"><span class="conv__name">${esc(u.name)}</span><span class="conv__time">${lastTime(c) ? timeAgo(lastTime(c)) : ''}</span></div>
      <div class="conv__bottom"><span class="conv__last">${esc(convPreview(c))}</span>${c.unread ? `<span class="conv__unread" aria-label="${c.unread} unread">${c.unread}</span>` : ''}</div></div></a>`;
  }).join('') : emptyHTML({ icon: 'search', title: 'No conversations found', text: 'Try a different name or word.', compact: true });
}
function bubbleHTML(m) {
  if (m.image) return `<button class="bubble bubble--img" type="button" data-action="view-image" data-src="${esc(m.image)}" aria-label="Open photo"><img src="${m.image}" alt="Shared photo" loading="lazy"></button>`;
  if (m.postRef) {
    const p = getPost(m.postRef);
    return p ? `<a class="bubble bubble--post" href="#/post/${p.id}"><small>Shared a post</small><strong>${esc(getUser(p.userId).name)}</strong><span>${esc(p.text || 'Photo')}</span></a>` : '<div class="bubble">Shared a post that is no longer available</div>';
  }
  return `${m.ctx ? `<span class="bubble__ctx">${esc(m.ctx)}</span>` : ''}<div class="bubble${isEmojiOnly(m.text) ? ' bubble--emoji' : ''}">${esc(m.text)}</div>`;
}
function messagesHTML(c) {
  const u = getUser(c.userId);
  if (!c.messages.length && !c.typing) return `<div class="chat-hello">${avatar(u, 76)}<h3>${esc(u.name)}</h3><p>${rel.friends.has(u.id) ? "You're friends on Connect." : 'You are not friends yet.'} Say hello 👋</p></div>`;
  const grouped = [];
  c.messages.forEach(m => {
    const g = grouped[grouped.length - 1];
    if (g && g.from === m.from && m.time - g.end < 5 * MIN && sameDay(g.end, m.time)) { g.items.push(m); g.end = m.time; }
    else grouped.push({ from: m.from, items: [m], start: m.time, end: m.time });
  });
  let html = '', lastDay = '';
  grouped.forEach(g => {
    const day = dayLabel(g.start);
    if (day !== lastDay) { html += `<div class="day-sep">${day}</div>`; lastDay = day; }
    const out = g.from === ME;
    html += `<div class="msg-row ${out ? 'msg-row--out' : 'msg-row--in'}">${out ? '' : `<span class="msg-row__avatar">${avatar(u, 28)}</span>`}<div class="msg-group"><div class="bubbles">${g.items.map(bubbleHTML).join('')}</div><time class="msg-time" datetime="${new Date(g.end).toISOString()}">${clock(g.end)}</time></div></div>`;
  });
  const last = c.messages[c.messages.length - 1];
  if (last && last.from === ME && !c.typing) html += `<div class="msg-seen">${c.seen ? 'Seen' : 'Sent'}</div>`;
  if (c.typing) html += `<div class="msg-row msg-row--in" aria-label="${esc(firstName(u))} is typing"><span class="msg-row__avatar" style="margin-bottom:0">${avatar(u, 28)}</span><div class="typing"><span></span><span></span><span></span></div></div>`;
  return html;
}
function renderChat(c) {
  const u = getUser(c.userId), pane = $('#chatPane');
  c.unread = 0;
  pane.innerHTML = `<div class="chat" style="height:100%;display:flex;flex-direction:column;min-height:0">
    <header class="chat__head">
      <a class="icon-btn chat__back" href="#/messages" aria-label="Back to chats">${icon('arrow-left')}</a>
      ${avatarLink(u, 42, { status: true, tab: false })}
      <div class="chat__who"><a class="chat__name" href="#/profile/${u.id}">${esc(u.name)}</a><span class="chat__status" id="chatStatus"></span></div>
      <div class="chat__tools">
        <button class="icon-btn" type="button" data-action="call" data-user="${u.id}" aria-label="Voice call">${icon('phone', 'icon--sm')}</button>
        <button class="icon-btn" type="button" data-action="call" data-user="${u.id}" data-video="1" aria-label="Video call">${icon('video', 'icon--sm')}</button>
        <a class="icon-btn" href="#/profile/${u.id}" aria-label="View profile">${icon('info', 'icon--sm')}</a>
      </div>
    </header>
    <div class="chat__body" id="chatBody" role="log" aria-live="polite"></div>
    <form class="chat__composer" data-form="message" data-conv="${c.id}">
      <button class="icon-btn" type="button" data-action="chat-attach" data-conv="${c.id}" aria-label="Send a photo">${icon('image')}</button>
      <div class="chat__input"><textarea name="text" rows="1" placeholder="Aa" aria-label="Message ${esc(u.name)}" maxlength="2000"></textarea><button class="icon-btn" type="button" data-action="chat-emoji" aria-label="Insert emoji" aria-expanded="false">${icon('smile')}</button></div>
      <button class="icon-btn chat__like" type="button" data-action="quick-like" data-conv="${c.id}" aria-label="Send a thumbs up">👍</button>
      <button class="icon-btn chat__send" type="submit" aria-label="Send message">${icon('send')}</button>
    </form>
  </div>`;
  paintChat(c);
  renderConvList();
  updateBadges();
  const form = $('.chat__composer', pane), ta = form.elements.text;
  ta.addEventListener('input', () => { autosize(ta, 120); form.classList.toggle('has-text', !!ta.value.trim()); });
  if (ui.prefill && ui.prefill.conv === c.id) { ta.value = ui.prefill.text; ui.prefill = null; ta.dispatchEvent(new Event('input')); }
  if (matchMedia('(hover: hover)').matches || ta.value) ta.focus({ preventScroll: true });
}
function paintChat(c) {
  if (ui.route.view !== 'messages' || ui.route.param !== c.id) return false;
  const body = $('#chatBody'), status = $('#chatStatus'), u = getUser(c.userId);
  if (!body) return false;
  body.innerHTML = messagesHTML(c);
  body.scrollTop = body.scrollHeight;
  status.textContent = c.typing ? 'typing…' : presence(u);
  status.classList.toggle('is-live', !!c.typing || isOnline(u));
  return true;
}

const views = {
  feed: viewFeed, post: viewPost, profile: viewProfile, friends: viewFriends, groups: viewGroups,
  events: viewEvents, saved: viewSaved, memories: viewMemories, notifications: viewNotifications,
  search: viewSearch, settings: viewSettings, messages: viewMessages,
};

/* ---------- 6. Features ---------- */

/* Reactions */
function reactTo(id, key) {
  const p = getPost(id), prev = p.myReaction;
  const next = key ? (key === prev ? null : key) : (prev ? null : 'like');
  if (prev) p.reactions[prev] = Math.max(0, (p.reactions[prev] || 0) - 1);
  if (next) p.reactions[next] = (p.reactions[next] || 0) + 1;
  p.myReaction = next;
  $$('.react.is-open').forEach(r => r.classList.remove('is-open'));
  refreshFooter(p, !!next);
}
function openReactions(id) {
  const p = getPost(id), total = sumReactions(p);
  const kinds = REACTIONS.filter(r => p.reactions[r.key] > 0);
  const people = [];
  if (p.myReaction) people.push({ u: me(), r: p.myReaction });
  users.filter(u => u.id !== ME && u.id !== p.userId).forEach((u, i) => {
    const r = kinds[i % kinds.length];
    if (r && people.length < Math.min(total, 9)) people.push({ u, r: r.key });
  });
  let tab = 'all';
  const m = openModal({ title: 'Reactions', className: 'modal--sm', content: '<div id="rxBody"></div>' });
  const paint = () => {
    const list = people.filter(x => tab === 'all' || x.r === tab), count = tab === 'all' ? total : p.reactions[tab];
    $('#rxBody', m).innerHTML = `<div class="chips chips--sm" role="group" aria-label="Filter reactions"><button class="chip" type="button" data-rx="all" aria-pressed="${tab === 'all'}">All ${fmtCount(total)}</button>${kinds.map(r => `<button class="chip" type="button" data-rx="${r.key}" aria-pressed="${tab === r.key}">${r.emoji} ${fmtCount(p.reactions[r.key])}</button>`).join('')}</div>
      <ul class="rx-list">${list.map(({ u, r }) => `<li class="rx-item"><span class="rx-item__av">${avatar(u, 40)}<span class="rx-emoji">${REACTIONS.find(x => x.key === r).emoji}</span></span><div class="person-row__main"><a class="person-row__name" href="#/profile/${u.id}">${esc(u.id === ME ? `${u.name} (you)` : u.name)}</a><span class="muted small">${esc(relLabel(u))}</span></div></li>`).join('')}</ul>
      ${count > list.length ? `<p class="rx-more">and ${plural(count - list.length, 'other')}</p>` : ''}`;
  };
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-rx]');
    if (b) { tab = b.dataset.rx; paint(); }
    if (e.target.closest('a[href^="#/profile"]')) closeModal(m);
  });
  paint();
}

/* Comments */
function addComment(p, text) {
  const c = { id: uid('cm'), userId: ME, text, time: Date.now(), likes: 0, liked: false };
  p.comments.push(c);
  refreshComments(p, { focus: true, newId: c.id });
  refreshFooter(p);
  // Demo touch: the author notices your comment a moment later.
  if (p.userId !== ME) setTimeout(() => { if (!p.comments.includes(c)) return; c.likes += 1; refreshComments(p); }, 3500);
}
function deleteComment(p, cId) {
  const i = p.comments.findIndex(c => c.id === cId);
  if (i < 0) return;
  const [c] = p.comments.splice(i, 1);
  refreshComments(p); refreshFooter(p);
  toast('Comment deleted', { icon: 'trash', action: 'Undo', onAction: () => { p.comments.splice(i, 0, c); refreshComments(p); refreshFooter(p); } });
}

/* Save / hide / delete / share */
function toggleSave(id) {
  const p = getPost(id), on = !ui.saved.has(id);
  on ? ui.saved.add(id) : ui.saved.delete(id);
  refreshFooter(p);
  if (on) toast('Saved to your collection', { icon: 'bookmark', action: 'View', onAction: () => { location.hash = '#/saved'; } });
  else toast('Removed from saved', { icon: 'bookmark', action: 'Undo', onAction: () => toggleSave(id) });
  if (ui.route.view === 'saved') refresh();
}
function copyLink(id) {
  const url = `${location.href.split('#')[0]}#/post/${id}`;
  const done = () => toast('Link copied to clipboard', { icon: 'link' });
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
  else fallbackCopy(url, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch { toast('Copy failed. Select the address bar to copy the link.', { icon: 'info' }); }
  ta.remove();
}
function hidePost(id) {
  ui.hidden.add(id);
  postEls(id).forEach(el => {
    el.innerHTML = `<div class="hidden-post">${icon('eye')}<p><strong>Post hidden</strong>You'll see fewer posts like this.</p><button class="btn btn--sm" type="button" data-action="unhide-post" data-post="${id}">Undo</button></div>`;
  });
}
async function deletePost(id) {
  const ok = await confirmDialog({ title: 'Delete post?', text: 'This post will be removed from your profile and your friends’ feeds. You can’t undo this.', confirmText: 'Delete', danger: true });
  if (!ok) return;
  posts = posts.filter(p => p.id !== id);
  ui.saved.delete(id);
  postEls(id).forEach(el => { el.style.transition = 'opacity .2s, transform .2s'; el.style.opacity = '0'; el.style.transform = 'scale(.98)'; setTimeout(() => el.remove(), 200); });
  toast('Post deleted', { icon: 'trash' });
  if (ui.route.view === 'post') location.hash = '#/feed';
}
function openPostMenu(btn) {
  if (activeMenu && activeMenu.anchor === btn) return closeMenu();
  const p = getPost(btn.dataset.post), own = p.userId === ME, saved = ui.saved.has(p.id), u = getUser(p.userId);
  openMenu(btn, [
    { icon: 'bookmark', label: saved ? 'Unsave post' : 'Save post', hint: saved ? 'Remove from your saved items' : 'Add this to your saved items', run: () => toggleSave(p.id) },
    { icon: 'link', label: 'Copy link', run: () => copyLink(p.id) },
    own ? { icon: PRIVACY[p.privacy].icon, label: 'Edit audience', hint: `Currently: ${PRIVACY[p.privacy].label}`, run: () => openMenu(btn, Object.entries(PRIVACY).map(([k, v]) => ({ icon: v.icon, label: v.label, checked: p.privacy === k, run: () => { p.privacy = k; refresh(); toast(`Audience changed to ${v.label}`, { icon: v.icon }); } }))) }
      : { icon: 'eye', label: 'Hide post', hint: 'See fewer posts like this', run: () => hidePost(p.id) },
    own ? { icon: 'trash', label: 'Delete post', danger: true, run: () => deletePost(p.id) }
      : { icon: 'chat', label: `Message ${firstName(u)}`, run: () => openChatWith(u.id) },
  ]);
}
function openShare(id) {
  const p = getPost(id), orig = (p.type === 'shared' && getPost(p.sharedId)) || p, ou = getUser(orig.userId), thumb = orig.images?.[0]?.src || orig.video?.poster;
  const friends = [...rel.friends].map(getUser).sort((a, b) => isOnline(b) - isOnline(a));
  const m = openModal({ title: 'Share post', content: `<div class="share">
    <div class="cf-user">${avatar(me(), 40)}<div><strong>${esc(me().name)}</strong><label class="privacy-select">${icon('globe', 'icon--xs')}<span class="sr-only">Audience</span><select name="privacy">${Object.entries(PRIVACY).map(([k, v]) => `<option value="${k}"${k === settings.defaultPrivacy ? ' selected' : ''}>${v.label}</option>`).join('')}</select></label></div></div>
    <textarea class="input" rows="2" placeholder="Say something about this…" aria-label="Add a message to your share"></textarea>
    <div class="share__preview">${thumb ? `<img src="${thumb}" alt="">` : avatar(ou, 44)}<div><strong>${esc(ou.name)}</strong><p>${esc(orig.text || 'Photo')}</p></div></div>
    <button class="btn btn--primary btn--block" type="button" data-share="feed">${icon('share')}<span>Share to feed</span></button>
    <h3 class="share__label">Send in Messages</h3>
    <div class="share-targets">${friends.map(u => `<button class="share-target" type="button" data-send="${u.id}" aria-label="Send to ${esc(u.name)}">${avatar(u, 52, { status: true })}<span>${esc(firstName(u))}</span></button>`).join('')}</div>
    <div class="share-opts"><button class="btn" type="button" data-share="copy">${icon('link')}<span>Copy link</span></button><button class="btn" type="button" data-share="native">${icon('share')}<span>More options</span></button></div>
  </div>`, initialFocus: 'textarea' });
  const ta = $('textarea', m), sel = $('select', m);
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-share], [data-send]');
    if (!b) return;
    if (b.dataset.send) {
      if (b.classList.contains('is-sent')) return;
      const c = convWith(b.dataset.send);
      sendMessage(c, { postRef: orig.id }, false);
      if (ta.value.trim()) sendMessage(c, { text: ta.value.trim() }, false);
      b.classList.add('is-sent'); b.setAttribute('aria-label', `Sent to ${getUser(b.dataset.send).name}`);
      toast(`Sent to ${getUser(b.dataset.send).name}`, { icon: 'send' });
      return;
    }
    if (b.dataset.share === 'copy') return copyLink(orig.id);
    if (b.dataset.share === 'native') {
      const url = `${location.href.split('#')[0]}#/post/${orig.id}`;
      if (navigator.share) navigator.share({ title: `${ou.name} on Connect`, text: orig.text?.slice(0, 120), url }).catch(() => {});
      else copyLink(orig.id);
      return;
    }
    const np = { id: uid('p'), userId: ME, time: Date.now(), privacy: sel.value, type: 'shared', sharedId: orig.id, text: ta.value.trim(), reactions: {}, myReaction: null, shares: 0, comments: [] };
    posts.unshift(np);
    p.shares = (p.shares || 0) + 1;
    refreshFooter(p);
    closeModal(m);
    toast('Shared to your feed', { icon: 'share', action: 'View', onAction: () => { location.hash = `#/post/${np.id}`; } });
    if (ui.route.view === 'feed') { ui.pendingNew = np.id; ui.feedFilter = 'all'; render(); }
  });
}

/* Polls */
function updatePoll(p, animate) {
  $$(`.poll[data-poll="${p.id}"]`).forEach(el => { el.outerHTML = pollHTML(p, animate); });
  if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$(`.poll[data-poll="${p.id}"] .poll__fill`).forEach(f => { f.style.width = `${f.dataset.pct}%`; })));
}
function vote(id, optId) {
  const p = getPost(id), poll = p.poll;
  if (poll.myVote === optId) return;
  const first = !poll.myVote;
  if (poll.myVote) poll.options.find(o => o.id === poll.myVote).votes--;
  poll.options.find(o => o.id === optId).votes++;
  poll.myVote = optId;
  updatePoll(p, true);
  toast(first ? 'Vote counted' : 'Vote changed', { icon: 'poll' });
}
function unvote(id) {
  const p = getPost(id), poll = p.poll;
  if (!poll.myVote) return;
  poll.options.find(o => o.id === poll.myVote).votes--;
  poll.myVote = null;
  updatePoll(p);
}

/* Video (simulated playback on a poster) */
function paintVideo(id) {
  const st = ui.videos.get(id) || { t: 0, playing: false }, dur = getPost(id).video.duration;
  $$(`.video[data-video="${id}"]`).forEach(v => {
    v.classList.toggle('is-playing', st.playing);
    $('.video__track i', v).style.width = `${(st.t / dur) * 100}%`;
    $('.video__track', v).setAttribute('aria-valuenow', Math.round(st.t));
    $('.video__time', v).textContent = `${mmss(st.t)} / ${mmss(dur)}`;
    const tg = $('.video__toggle', v);
    tg.innerHTML = icon(st.playing ? 'pause' : 'play', 'icon--sm');
    tg.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
  });
}
const videoState = id => { if (!ui.videos.has(id)) ui.videos.set(id, { t: 0, playing: false, timer: null }); return ui.videos.get(id); };
function pauseVideo(id) { const st = ui.videos.get(id); if (!st) return; st.playing = false; clearInterval(st.timer); paintVideo(id); }
function playVideo(id) {
  ui.videos.forEach((s, k) => { if (k !== id && s.playing) pauseVideo(k); });
  const st = videoState(id), dur = getPost(id).video.duration;
  if (st.t >= dur) st.t = 0;
  st.playing = true;
  clearInterval(st.timer);
  st.timer = setInterval(() => { st.t = Math.min(dur, st.t + 0.25); if (st.t >= dur) pauseVideo(id); else paintVideo(id); }, 250);
  paintVideo(id);
}
const toggleVideo = id => (videoState(id).playing ? pauseVideo(id) : playVideo(id));
function seekVideo(id, ratio) { const st = videoState(id); st.t = Math.min(1, Math.max(0, ratio)) * getPost(id).video.duration; paintVideo(id); }
function stopVideos() { ui.videos.forEach((s, k) => { if (s.playing) { s.playing = false; clearInterval(s.timer); } void k; }); }

/* Lightbox */
function openLightbox(images, index = 0, caption = '') {
  if (!images?.length) return;
  let i = index, startX = null;
  const onKey = e => {
    if (topModal() !== m) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  };
  const m = openModal({ bare: true, className: 'modal--lightbox', label: 'Photo viewer', onClose: () => document.removeEventListener('keydown', onKey),
    content: `<div class="lightbox"><button class="lb-btn lb-close" type="button" data-close aria-label="Close photo viewer">${icon('x')}</button><span class="lb-counter" aria-live="polite"></span>
      <button class="lb-btn lb-prev" type="button" data-lb="-1" aria-label="Previous photo">${icon('chev-left')}</button>
      <figure class="lb-figure"><img alt=""><figcaption></figcaption></figure>
      <button class="lb-btn lb-next" type="button" data-lb="1" aria-label="Next photo">${icon('chev-right')}</button></div>` });
  const imgEl = $('.lb-figure img', m), capEl = $('figcaption', m), counter = $('.lb-counter', m), multi = images.length > 1;
  const show = () => {
    const im = images[i];
    imgEl.classList.remove('lb-in'); void imgEl.offsetWidth;
    imgEl.src = im.src; imgEl.alt = im.alt || '';
    imgEl.classList.add('lb-in');
    counter.textContent = `${i + 1} / ${images.length}`; counter.hidden = !multi;
    capEl.textContent = caption ? truncate(caption, 200) : (im.alt || '');
  };
  const go = d => { if (!multi) return; i = (i + d + images.length) % images.length; show(); };
  $$('[data-lb]', m).forEach(b => { b.hidden = !multi; b.addEventListener('click', () => go(+b.dataset.lb)); });
  $('.lightbox', m).addEventListener('click', e => { if (e.target.classList.contains('lightbox') || e.target.classList.contains('lb-figure')) closeModal(m); });
  m.addEventListener('pointerdown', e => { startX = e.clientX; });
  m.addEventListener('pointerup', e => { if (startX != null && Math.abs(e.clientX - startX) > 50) go(e.clientX < startX ? 1 : -1); startX = null; });
  document.addEventListener('keydown', onKey);
  show();
}

/* Story viewer */
function openStoryViewer(start = 0) {
  const list = storyList();
  if (!list.length) return;
  const DURATION = 5000;
  let si = Math.min(start, list.length - 1), slide = 0, elapsed = 0, paused = false, last = 0, raf = 0, closed = false, held = false, holdTimer;
  const onKey = e => {
    if (topModal() !== m || e.target.matches('input')) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ') { e.preventDefault(); setPaused(!paused); }
  };
  const m = openModal({ bare: true, className: 'modal--story', label: 'Stories', onClose: () => { closed = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); refreshStories(); },
    content: `<div class="story-viewer">
      <button class="lb-btn sv-close" type="button" data-close aria-label="Close stories">${icon('x')}</button>
      <button class="lb-btn sv-arrow" type="button" data-sv="prev" aria-label="Previous">${icon('chev-left')}</button>
      <div class="sv-stage">
        <div class="sv-media"></div><div class="sv-progress" aria-hidden="true"></div><header class="sv-head"></header><p class="sv-caption"></p>
        <button class="sv-tap sv-tap--prev" type="button" data-sv="prev" aria-label="Previous"></button>
        <button class="sv-tap sv-tap--next" type="button" data-sv="next" aria-label="Next"></button>
        <form class="sv-reply"><input type="text" maxlength="300" aria-label="Reply to story"><button type="button" data-sv="heart" aria-label="Send a heart">❤️</button><button type="submit" aria-label="Send reply">${icon('send')}</button></form>
      </div>
      <button class="lb-btn sv-arrow" type="button" data-sv="next" aria-label="Next">${icon('chev-right')}</button>
    </div>` });
  const stage = $('.sv-stage', m), media = $('.sv-media', m), prog = $('.sv-progress', m), head = $('.sv-head', m), capEl = $('.sv-caption', m), form = $('.sv-reply', m), input = $('input', form);
  function show() {
    const s = list[si], u = getUser(s.userId), sl = s.slides[slide];
    s.seen = true; elapsed = 0;
    prog.innerHTML = s.slides.map((_, k) => `<span><i style="width:${k < slide ? 100 : 0}%"></i></span>`).join('');
    head.innerHTML = `${avatar(u, 36)}<div class="sv-who"><strong>${esc(u.id === ME ? 'Your story' : u.name)}</strong><span>${timeAgo(sl.time || Date.now(), true)}</span></div><button class="sv-pause" type="button" data-sv="pause" aria-label="${paused ? 'Resume' : 'Pause'}">${icon(paused ? 'play' : 'pause', 'icon--sm')}</button>`;
    media.innerHTML = sl.type === 'image' ? `<img class="sv-in" src="${sl.src}" alt="${esc(sl.caption || `${u.name}'s story`)}">` : `<div class="sv-text sv-in" style="background:${sl.bg}"><p>${esc(sl.text)}</p></div>`;
    capEl.textContent = sl.caption || ''; capEl.hidden = !sl.caption;
    form.hidden = u.id === ME;
    input.placeholder = `Reply to ${firstName(u)}…`;
    const arrows = $$('.sv-arrow', m);
    arrows[0].disabled = si === 0 && slide === 0;
    arrows[1].disabled = si === list.length - 1 && slide === s.slides.length - 1;
  }
  function tick(t) {
    if (closed) return;
    if (!last) last = t;
    const dt = t - last; last = t;
    if (!paused) elapsed += dt;
    const bar = prog.children[slide]?.firstElementChild;
    if (bar) bar.style.width = `${Math.min(100, (elapsed / DURATION) * 100)}%`;
    if (elapsed >= DURATION) next();
    if (!closed) raf = requestAnimationFrame(tick);
  }
  function next() {
    const s = list[si];
    if (slide < s.slides.length - 1) slide++;
    else if (si < list.length - 1) { si++; slide = 0; }
    else { closeModal(m); return; }
    show();
  }
  function prev() {
    if (slide > 0) slide--;
    else if (si > 0) { si--; slide = 0; }
    show();
  }
  function setPaused(v) {
    paused = v;
    stage.classList.toggle('is-paused', v);
    const b = $('.sv-pause', m);
    if (b) { b.innerHTML = icon(v ? 'play' : 'pause', 'icon--sm'); b.setAttribute('aria-label', v ? 'Resume' : 'Pause'); }
  }
  function reply(text) {
    const u = getUser(list[si].userId), c = convWith(u.id);
    sendMessage(c, { text, ctx: 'You replied to their story' });
    input.value = ''; input.blur();
    toast(`Reply sent to ${firstName(u)}`, { icon: 'send' });
  }
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-sv]');
    if (!b) return;
    if (held) { held = false; return; }
    const a = b.dataset.sv;
    if (a === 'next') next();
    else if (a === 'prev') prev();
    else if (a === 'pause') setPaused(!paused);
    else if (a === 'heart') reply('❤️');
  });
  $$('.sv-tap', m).forEach(t => {
    t.addEventListener('pointerdown', () => { holdTimer = setTimeout(() => { held = true; setPaused(true); }, 220); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => t.addEventListener(ev, () => { clearTimeout(holdTimer); if (held) setPaused(false); }));
  });
  input.addEventListener('focus', () => setPaused(true));
  input.addEventListener('blur', () => setPaused(false));
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (v) reply(v); });
  document.addEventListener('keydown', onKey);
  show();
  raf = requestAnimationFrame(tick);
}

/* Story creator */
function openStoryCreator() {
  let mode = 'text', bg = STORY_BGS[0], image = null;
  const m = openModal({ title: 'Create story', content: `<div class="segmented" role="radiogroup" aria-label="Story type"><button type="button" role="radio" data-mode="text" aria-checked="true">${icon('edit')}Text</button><button type="button" role="radio" data-mode="photo" aria-checked="false">${icon('image')}Photo</button></div>
    <div class="sc-preview" aria-hidden="true"><img hidden alt=""><p>Start typing</p></div>
    <div data-panel="text"><textarea class="input" rows="2" maxlength="140" placeholder="What's happening?" aria-label="Story text"></textarea>
      <div class="sc-swatches" role="group" aria-label="Background">${STORY_BGS.map((b, i) => `<button class="sc-swatch" type="button" data-bg="${i}" style="background:${b}" aria-label="Background ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}</div></div>
    <div data-panel="photo" hidden><div class="cf-panel"><div class="cf-panel__head"><span>Choose a photo</span><button class="btn btn--sm" type="button" data-upload>${icon('image')}<span>Upload</span></button></div><div class="cf-samples">${SAMPLE_PHOTOS.map((p, i) => `<button class="cf-sample" type="button" data-sample="${i}" aria-label="Use ${esc(p.alt)} photo"><img src="${p.src}" alt=""></button>`).join('')}</div></div>
      <input class="input" type="text" maxlength="80" placeholder="Add a caption (optional)" aria-label="Caption" style="margin-top:10px"></div>
    <button class="btn btn--primary btn--block" type="button" data-publish style="margin-top:14px" disabled>Share to story</button>`, initialFocus: 'textarea' });
  const preview = $('.sc-preview', m), pImg = $('img', preview), pText = $('p', preview), ta = $('textarea', m), capIn = $('[data-panel="photo"] input', m), publish = $('[data-publish]', m);
  const paint = () => {
    preview.style.background = mode === 'text' ? bg : '#0B1211';
    pImg.hidden = mode !== 'photo' || !image;
    if (image) pImg.src = image;
    pText.textContent = mode === 'text' ? (ta.value || 'Start typing') : (capIn.value || (image ? '' : 'Pick a photo below'));
    publish.disabled = mode === 'text' ? !ta.value.trim() : !image;
  };
  m.addEventListener('click', e => {
    const t = e.target.closest('[data-mode], [data-bg], [data-sample], [data-upload], [data-publish]');
    if (!t) return;
    if (t.dataset.mode) {
      mode = t.dataset.mode;
      $$('[data-mode]', m).forEach(b => b.setAttribute('aria-checked', b === t));
      $$('[data-panel]', m).forEach(p => { p.hidden = p.dataset.panel !== mode; });
    } else if (t.dataset.bg) {
      bg = STORY_BGS[+t.dataset.bg];
      $$('[data-bg]', m).forEach(b => b.setAttribute('aria-pressed', b === t));
    } else if (t.dataset.sample) image = SAMPLE_PHOTOS[+t.dataset.sample].src;
    else if (t.hasAttribute('data-upload')) { pickImages({ multiple: false }).then(list => { if (list[0]) { image = list[0].src; paint(); } }); return; }
    else if (t.hasAttribute('data-publish')) {
      const slide = mode === 'text' ? { type: 'text', text: ta.value.trim(), bg, time: Date.now() } : { type: 'image', src: image, caption: capIn.value.trim(), time: Date.now() };
      ui.myStory = ui.myStory || { userId: ME, seen: false, slides: [] };
      ui.myStory.slides.push(slide);
      ui.myStory.seen = false;
      closeModal(m);
      refreshStories();
      toast('Your story is live for 24 hours', { icon: 'check', action: 'View', onAction: () => openStoryViewer(0) });
      return;
    }
    paint();
  });
  ta.addEventListener('input', paint); capIn.addEventListener('input', paint);
  paint();
}

/* Post composer */
function openComposer(mode) {
  const m0 = me(), draft = { images: [], poll: mode === 'poll' ? ['', ''] : null, feeling: null };
  const modal = openModal({ title: 'Create post', className: 'modal--composer', initialFocus: '.cf-text', content: `<form class="cf" novalidate>
    <div class="cf-user">${avatar(m0, 44)}<div><strong>${esc(m0.name)}<span class="feeling-label"></span></strong>
      <label class="privacy-select">${icon('globe', 'icon--xs')}<span class="sr-only">Audience</span><select name="privacy">${Object.entries(PRIVACY).map(([k, v]) => `<option value="${k}"${k === settings.defaultPrivacy ? ' selected' : ''}>${v.label}</option>`).join('')}</select></label></div></div>
    <textarea class="cf-text" name="text" rows="3" maxlength="5000" placeholder="What's on your mind, ${esc(firstName(m0))}?" aria-label="Post text"></textarea>
    <div class="cf-images"></div>
    <div class="cf-panel" data-p="photos" hidden><div class="cf-panel__head"><span>Add photos</span><button class="btn btn--sm" type="button" data-cf="upload">${icon('image')}<span>Upload from device</span></button></div><div class="cf-samples">${SAMPLE_PHOTOS.map((p, i) => `<button class="cf-sample" type="button" data-cf="sample" data-i="${i}" aria-label="Add sample photo: ${esc(p.alt)}"><img src="${p.src}" alt=""></button>`).join('')}</div></div>
    <div class="cf-panel" data-p="poll" hidden></div>
    <div class="cf-panel" data-p="feelings" hidden><div class="cf-panel__head"><span>How are you feeling?</span></div><div class="cf-feelings">${FEELINGS.map(f => `<button class="chip" type="button" data-cf="feeling" data-f="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join('')}</div></div>
    <div class="cf-tools"><span>Add to your post</span>
      <button class="tool" type="button" style="--c:#16A34A" data-cf="photos" aria-label="Photos" title="Photos">${icon('image')}</button>
      <button class="tool" type="button" style="--c:#E8912D" data-cf="poll" aria-label="Poll" title="Poll">${icon('poll')}</button>
      <button class="tool" type="button" style="--c:#E11D48" data-cf="feelings" aria-label="Feeling" title="Feeling">${icon('smile')}</button>
    </div>
    <button class="btn btn--primary btn--block" type="submit" disabled>Post</button>
  </form>` });
  const form = $('.cf', modal), ta = form.elements.text, imgBox = $('.cf-images', form), submit = $('[type="submit"]', form);
  const panel = k => $(`[data-p="${k}"]`, form), tool = k => $(`.tool[data-cf="${k}"]`, form);
  const valid = () => {
    if (draft.poll) return !!ta.value.trim() && draft.poll.filter(o => o.trim()).length >= 2;
    return !!(ta.value.trim() || draft.images.length);
  };
  const sync = () => {
    submit.disabled = !valid();
    submit.textContent = draft.poll && !valid() ? 'Add a question and 2 options' : 'Post';
    ta.classList.toggle('is-small', draft.images.length > 0 || !!draft.poll || ta.value.length > 120);
    tool('photos').classList.toggle('is-on', !panel('photos').hidden || draft.images.length > 0);
    tool('photos').disabled = !!draft.poll;
    tool('poll').classList.toggle('is-on', !!draft.poll);
    tool('poll').disabled = draft.images.length > 0;
    tool('feelings').classList.toggle('is-on', !panel('feelings').hidden || !!draft.feeling);
    $('.feeling-label', form).textContent = draft.feeling ? ` is feeling ${draft.feeling}` : '';
    $$('[data-cf="feeling"]', form).forEach(b => b.setAttribute('aria-pressed', b.dataset.f === draft.feeling));
  };
  const renderImages = () => {
    imgBox.innerHTML = draft.images.map((im, i) => `<div class="cf-thumb"><img src="${im.src}" alt="${esc(im.alt)}"><button class="cf-remove" type="button" data-cf="remove" data-i="${i}" aria-label="Remove photo ${i + 1}">${icon('x', 'icon--sm')}</button></div>`).join('');
    sync();
  };
  const renderPoll = () => {
    const box = panel('poll');
    box.hidden = !draft.poll;
    if (draft.poll) {
      box.innerHTML = `<div class="cf-panel__head"><span>Poll options</span><button class="link small" type="button" data-cf="poll-remove">Remove poll</button></div><div class="cf-poll">
        <p class="field__hint">Your post text becomes the poll question.</p>
        ${draft.poll.map((o, i) => `<div class="cf-poll__row"><input class="input" data-poll-i="${i}" value="${esc(o)}" placeholder="Option ${i + 1}" maxlength="80" aria-label="Poll option ${i + 1}">${draft.poll.length > 2 ? `<button class="icon-btn" type="button" data-cf="opt-remove" data-i="${i}" aria-label="Remove option ${i + 1}">${icon('x', 'icon--sm')}</button>` : ''}</div>`).join('')}
        ${draft.poll.length < 4 ? `<button class="btn btn--ghost btn--sm" type="button" data-cf="opt-add">${icon('plus')}<span>Add option</span></button>` : ''}</div>`;
    }
    sync();
  };
  form.addEventListener('input', e => {
    if (e.target === ta) autosize(ta, innerHeight * 0.4);
    if (e.target.dataset.pollI != null) draft.poll[+e.target.dataset.pollI] = e.target.value;
    sync();
  });
  form.elements.privacy.addEventListener('change', () => { $('.privacy-select use', form).setAttribute('href', `#i-${PRIVACY[form.elements.privacy.value].icon}`); });
  form.elements.privacy.dispatchEvent(new Event('change'));
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-cf]');
    if (!b) return;
    const a = b.dataset.cf;
    if (a === 'upload') { pickImages().then(list => { draft.images.push(...list); renderImages(); }); return; }
    if (a === 'sample') { const s = SAMPLE_PHOTOS[+b.dataset.i]; if (!draft.images.includes(s)) draft.images.push(s); renderImages(); return; }
    if (a === 'remove') { draft.images.splice(+b.dataset.i, 1); renderImages(); return; }
    if (a === 'photos') { panel('photos').hidden = !panel('photos').hidden; sync(); return; }
    if (a === 'feelings') { panel('feelings').hidden = !panel('feelings').hidden; sync(); return; }
    if (a === 'feeling') { draft.feeling = draft.feeling === b.dataset.f ? null : b.dataset.f; sync(); return; }
    if (a === 'poll') { draft.poll = draft.poll ? null : ['', '']; panel('photos').hidden = true; renderPoll(); $('[data-poll-i="0"]', form)?.focus(); return; }
    if (a === 'poll-remove') { draft.poll = null; renderPoll(); return; }
    if (a === 'opt-add') { draft.poll.push(''); renderPoll(); $(`[data-poll-i="${draft.poll.length - 1}"]`, form).focus(); return; }
    if (a === 'opt-remove') { draft.poll.splice(+b.dataset.i, 1); renderPoll(); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!valid()) return;
    const p = { id: uid('p'), userId: ME, time: Date.now(), privacy: form.elements.privacy.value, feeling: draft.feeling, text: ta.value.trim(), reactions: {}, myReaction: null, shares: 0, comments: [] };
    if (draft.poll) { p.type = 'poll'; p.poll = { options: draft.poll.filter(o => o.trim()).map((o, i) => ({ id: `o${i}`, text: o.trim(), votes: 0 })), myVote: null, endsIn: '7 days' }; }
    else if (draft.images.length) { p.type = draft.images.length > 1 ? 'images' : 'image'; p.images = [...draft.images]; }
    else p.type = 'text';
    posts.unshift(p);
    closeModal(modal);
    ui.feedFilter = 'all';
    ui.pendingNew = p.id;
    if (ui.route.view === 'feed') render(); else location.hash = '#/feed';
    toast('Your post is live', { icon: 'check', action: 'Undo', onAction: () => { posts = posts.filter(x => x !== p); if (ui.route.view === 'feed') refresh(); } });
  });
  if (mode === 'photo') panel('photos').hidden = false;
  if (mode === 'feeling') panel('feelings').hidden = false;
  renderPoll();
}

/* Friends */
function afterRelationChange() {
  updateBadges();
  renderRightSidebar();
  if (isOpen('dd-notifs')) renderNotifDropdown();
  if (['friends', 'profile', 'search', 'notifications', 'feed'].includes(ui.route.view)) refresh();
}
function addFriend(id) {
  const u = getUser(id);
  rel.requestsOut.add(id);
  toast(`Friend request sent to ${u.name}`, { icon: 'user-plus', action: 'Undo', onAction: () => { rel.requestsOut.delete(id); afterRelationChange(); } });
  afterRelationChange();
  // Demo: the other person accepts after a short while.
  setTimeout(() => {
    if (!rel.requestsOut.has(id)) return;
    rel.requestsOut.delete(id);
    rel.friends.add(id);
    notifications.unshift({ id: uid('n'), type: 'friend_accept', userId: id, text: 'accepted your friend request. Say hi 👋', time: Date.now(), read: false, link: `#/profile/${id}` });
    toast(`${u.name} accepted your friend request`, { icon: 'user-check', action: 'Message', onAction: () => openChatWith(id) });
    chime(); bumpBadge('notifs');
    afterRelationChange();
  }, 7000 + Math.random() * 3000);
}
function acceptRequest(id) {
  rel.requestsIn = rel.requestsIn.filter(x => x !== id);
  rel.friends.add(id);
  notifications.filter(n => n.userId === id && n.type === 'friend_request').forEach(n => { n.type = 'friend_accept'; n.text = 'is now your friend. Say hi 👋'; n.read = true; });
  toast(`You and ${getUser(id).name} are now friends`, { icon: 'user-check' });
  afterRelationChange();
}
function declineRequest(id) {
  rel.requestsIn = rel.requestsIn.filter(x => x !== id);
  notifications = notifications.filter(n => !(n.userId === id && n.type === 'friend_request'));
  toast('Request deleted', { icon: 'user-minus' });
  afterRelationChange();
}
async function removeFriend(id) {
  const u = getUser(id);
  const ok = await confirmDialog({ title: `Unfriend ${u.name}?`, text: `${firstName(u)} won't be notified. You'll stop seeing each other's friends-only posts.`, confirmText: 'Unfriend', danger: true });
  if (!ok) return;
  rel.friends.delete(id);
  rel.following.delete(id);
  toast(`${u.name} was removed from your friends`, { icon: 'user-minus' });
  afterRelationChange();
}
function friendMenu(btn) {
  if (activeMenu && activeMenu.anchor === btn) return closeMenu();
  const id = btn.dataset.user, u = getUser(id), following = rel.following.has(id);
  openMenu(btn, [
    { icon: 'chat', label: `Message ${firstName(u)}`, run: () => openChatWith(id) },
    { icon: following ? 'eye' : 'star', label: following ? 'Unfollow' : 'Follow', hint: following ? 'Stay friends but see fewer posts' : 'See their public posts first', run: () => toggleFollow(id) },
    { icon: 'user-minus', label: 'Unfriend', danger: true, run: () => removeFriend(id) },
  ]);
}
function toggleFollow(id) {
  const u = getUser(id), on = !rel.following.has(id);
  on ? rel.following.add(id) : rel.following.delete(id);
  u.followers += on ? 1 : -1;
  toast(on ? `You're following ${u.name}` : `You unfollowed ${u.name}`, { icon: on ? 'star' : 'eye' });
  if (['profile', 'feed'].includes(ui.route.view)) refresh();
}
function openChatWith(userId) {
  const c = convWith(userId);
  closeDrawer();
  location.hash = `#/messages/${c.id}`;
}
function openNewMessage() {
  const list = [...rel.friends].map(getUser).sort((a, b) => a.name.localeCompare(b.name));
  const m = openModal({ title: 'New message', className: 'modal--sm', initialFocus: 'input', content: `<label class="conv-search" style="margin:0 0 10px">${icon('search', 'icon--sm')}<input type="search" placeholder="Search friends" aria-label="Search friends"></label><ul class="plain-list" id="nmList">${list.map(u => `<li><button class="contact" type="button" data-to="${u.id}" data-name="${esc(normalize(u.name))}">${avatar(u, 40, { status: true })}<span class="contact__name">${esc(u.name)}</span><span class="contact__seen">${esc(presence(u))}</span></button></li>`).join('')}</ul>` });
  $('input', m).addEventListener('input', e => { const q = normalize(e.target.value.trim()); $$('[data-to]', m).forEach(b => { b.parentElement.hidden = !b.dataset.name.includes(q); }); });
  m.addEventListener('click', e => { const b = e.target.closest('[data-to]'); if (b) { closeModal(m); openChatWith(b.dataset.to); } });
}

/* Messaging */
function sendMessage(c, msg, autoReply = true) {
  c.messages.push({ from: ME, time: Date.now(), ...msg });
  c.seen = false; c.typing = false;
  paintChat(c);
  renderConvList();
  if (autoReply) simulateReply(c);
}
function simulateReply(c) {
  const u = getUser(c.userId);
  clearTimeout(c._t1); clearTimeout(c._t2);
  c._t1 = setTimeout(() => {
    c.seen = true;
    c.typing = true;
    paintChat(c); renderConvList();
    c._t2 = setTimeout(() => {
      c.typing = false;
      const pool = REPLIES[u.lang] || REPLIES.en;
      c.messages.push({ from: c.userId, text: pool[Math.floor(Math.random() * pool.length)], time: Date.now() });
      onIncoming(c);
    }, 1400 + Math.random() * 1400);
  }, 900);
}
function onIncoming(c) {
  const u = getUser(c.userId), last = c.messages[c.messages.length - 1];
  if (!paintChat(c)) {
    c.unread += 1;
    const text = settings.previews ? truncate(last.text || 'Sent a photo', 60) : 'sent you a message';
    toast(`<strong>${esc(u.name)}</strong>: ${esc(text)}`, { html: true, icon: 'chat', action: 'Reply', onAction: () => { location.hash = `#/messages/${c.id}`; } });
    chime(); bumpBadge('messages');
  }
  renderConvList();
  updateBadges();
}
function notifArrived() {
  updateBadges(); bumpBadge('notifs'); chime();
  if (isOpen('dd-notifs')) renderNotifDropdown();
  if (ui.route.view === 'notifications') refresh();
}
function scheduleLiveActivity() {
  setTimeout(() => {
    const c = getConv('c2');
    c.messages.push({ from: 'u3', text: 'Also, which beach is best for sunrise? 🌅', time: Date.now() });
    onIncoming(c);
  }, 16000);
  setTimeout(() => {
    const p = getPost('p8');
    p.reactions.wow = (p.reactions.wow || 0) + 1;
    refreshFooter(p);
    notifications.unshift({ id: uid('n'), type: 'reaction', userId: 'u9', text: 'reacted 😮 to your post: "Redesigning our onboarding flow…"', time: Date.now(), read: false, link: '#/post/p8' });
    notifArrived();
  }, 30000);
}
function toggleEmojiPop(btn) {
  const form = btn.closest('form'), existing = $('.emoji-pop', form);
  if (existing) { existing.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
  const pop = document.createElement('div');
  pop.className = 'emoji-pop';
  pop.setAttribute('role', 'group');
  pop.setAttribute('aria-label', 'Emoji');
  pop.innerHTML = EMOJIS.map(e => `<button type="button" data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join('');
  form.append(pop);
  btn.setAttribute('aria-expanded', 'true');
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-emoji]');
    if (!b) return;
    const ta = form.elements.text, s = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, s) + b.dataset.emoji + ta.value.slice(ta.selectionEnd ?? s);
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + b.dataset.emoji.length;
    ta.dispatchEvent(new Event('input'));
  });
  $('button', pop).focus();
}
function startCall(userId, video) {
  const u = getUser(userId);
  let t1, t2;
  const m = openModal({ bare: true, className: 'modal--call', label: `Calling ${u.name}`, onClose: () => { clearTimeout(t1); clearTimeout(t2); },
    content: `<div class="call">${avatar(u, 112)}<h2>${esc(u.name)}</h2><p class="call__status" aria-live="polite">${video ? 'Starting video call' : 'Calling'}…</p><button class="call__end" type="button" data-close aria-label="End call">${icon('phone')}</button></div>` });
  const status = $('.call__status', m);
  t1 = setTimeout(() => { status.textContent = 'Ringing…'; }, 1500);
  t2 = setTimeout(() => { status.textContent = isOnline(u) ? `${firstName(u)} didn't answer. Try sending a message.` : `${firstName(u)} is offline right now.`; }, 6000);
}

/* Groups & events */
function openGroup(id) {
  const g = groups.find(x => x.id === id);
  closeDrawer();
  const m = openModal({ title: g.name, className: 'modal--lg', content: `<img class="gm-cover" src="${g.cover}" alt="">
    <p class="meta-line" style="margin-bottom:8px">${icon(g.privacy === 'private' ? 'lock' : 'globe', 'icon--xs')}${g.privacy === 'private' ? 'Private' : 'Public'} group, ${fmtCount(g.members)} members</p>
    <p style="margin-bottom:14px">${esc(g.desc)}</p>
    <h3 class="share__label" style="margin-bottom:4px">Recent discussion</h3>
    ${g.discussion.map(d => { const u = getUser(d.userId); return `<div class="gm-post">${avatar(u, 36)}<div><strong>${esc(u.name)}</strong> <span class="muted small">${timeAgo(d.time, true)}</span><p>${esc(d.text)}</p></div></div>`; }).join('')}
    <div class="modal__actions">${g.joined ? `<button class="btn" type="button" data-g="leave">Leave group</button><button class="btn btn--primary" type="button" data-g="invite">${icon('user-plus')}<span>Invite friends</span></button>` : `<button class="btn btn--primary" type="button" data-g="join">${icon('plus')}<span>Join group</span></button>`}</div>` });
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    if (b.dataset.g === 'join') { closeModal(m); joinGroup(id); }
    if (b.dataset.g === 'invite') { closeModal(m); toast(`Invites sent to ${Math.min(3, rel.friends.size)} friends`, { icon: 'send' }); }
    if (b.dataset.g === 'leave') {
      closeModal(m);
      if (await confirmDialog({ title: `Leave ${g.name}?`, text: "You'll stop seeing posts from this group. You can join again any time.", confirmText: 'Leave group', danger: true })) {
        g.joined = false; g.members--; renderLeftSidebar(); setActiveNav(navKey());
        toast(`You left ${g.name}`, { icon: 'group' });
        if (ui.route.view === 'groups') refresh();
      }
    }
  });
}
function joinGroup(id) {
  const g = groups.find(x => x.id === id);
  g.joined = true; g.members++;
  renderLeftSidebar(); setActiveNav(navKey()); updateBadges();
  toast(`You joined ${g.name}`, { icon: 'group' });
  if (ui.route.view === 'groups') refresh();
}
function openCreateGroup() {
  const m = openModal({ title: 'Create group', className: 'modal--sm', initialFocus: '#g-name', content: `<form novalidate>
    <div class="field"><label for="g-name">Group name</label><input id="g-name" class="input" name="name" maxlength="60" required placeholder="e.g. Đà Nẵng Runners"></div>
    <div class="field"><label for="g-desc">Description</label><textarea id="g-desc" class="input" name="desc" rows="3" maxlength="200" placeholder="What is this group about?"></textarea></div>
    <div class="field"><label for="g-privacy">Privacy</label><select id="g-privacy" class="input" name="privacy"><option value="public">Public: anyone can see posts</option><option value="private">Private: only members see posts</option></select></div>
    <p class="field__hint" data-err hidden style="color:var(--danger)">Give your group a name to continue.</p>
    <div class="modal__actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit">Create group</button></div></form>` });
  $('form', m).addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, name = f.elements.name.value.trim();
    if (!name) { $('[data-err]', m).hidden = false; f.elements.name.focus(); return; }
    groups.unshift({ id: uid('g'), name, desc: f.elements.desc.value.trim() || 'A new group on Connect.', privacy: f.elements.privacy.value, members: 1, joined: true, cover: SAMPLE_PHOTOS[Math.floor(Math.random() * SAMPLE_PHOTOS.length)].src, activity: 'Created just now', discussion: [{ userId: ME, text: `Welcome to ${name}! Introduce yourself 👋`, time: Date.now() }] });
    closeModal(m); renderLeftSidebar(); setActiveNav(navKey());
    toast(`${name} was created`, { icon: 'group' });
    if (ui.route.view === 'groups') refresh(); else location.hash = '#/groups';
  });
}
function setEventStatus(id, status) {
  const e = events.find(x => x.id === id), prev = e.status;
  if (prev) e[prev]--;
  e.status = prev === status ? null : status;
  if (e.status) e[e.status]++;
  toast(e.status === 'going' ? `You're going to ${e.title}` : e.status === 'interested' ? `Marked as interested` : 'Removed from your events', { icon: e.status === 'going' ? 'check' : 'star' });
  refresh();
  renderRightSidebar();
}

/* Profile editing */
function applyProfilePhoto(kind) {
  pickImages({ multiple: false }).then(list => {
    if (!list[0]) return;
    me()[kind === 'avatar' ? 'photo' : 'cover'] = list[0].src;
    renderChrome(); refresh();
    toast(kind === 'avatar' ? 'Profile picture updated' : 'Cover photo updated', { icon: 'camera' });
  });
}
function openEditProfile() {
  const u = me();
  let photoSrc = u.photo || null, cover = u.cover;
  const field = (id, label, value, attrs = '') => `<div class="field"><label for="ep-${id}">${label}</label><input id="ep-${id}" class="input" name="${id}" value="${esc(value || '')}" ${attrs}></div>`;
  const m = openModal({ title: 'Edit profile', initialFocus: '#ep-name', content: `<form novalidate>
    <div class="ep-media"><div class="ep-cover" style="background-image:url('${cover}')"><button class="btn btn--sm btn--glass" type="button" data-ep="cover">${icon('camera')}<span>Change cover</span></button></div>
      <div class="ep-avatar" id="epAvatar">${avatar(u, 92)}</div><div class="ep-avatar" style="pointer-events:none"><button class="icon-btn" type="button" data-ep="avatar" aria-label="Change profile picture" style="pointer-events:auto;position:absolute;left:66px;bottom:-4px">${icon('camera', 'icon--sm')}</button></div></div>
    ${field('name', 'Name', u.name, 'maxlength="40" required autocomplete="name"')}
    <div class="field"><label for="ep-bio">Bio</label><textarea id="ep-bio" class="input" name="bio" rows="2" maxlength="160">${esc(u.bio || '')}</textarea><span class="field__hint" id="bioCount"></span></div>
    <div class="field__row">${field('location', 'Lives in', u.location, 'maxlength="60"')}${field('hometown', 'From', u.hometown, 'maxlength="60"')}</div>
    <div class="field__row">${field('work', 'Work', u.work, 'maxlength="80"')}${field('education', 'Education', u.education, 'maxlength="80"')}</div>
    ${field('website', 'Website', u.website, 'maxlength="80" inputmode="url"')}
    <p class="field__hint" data-err hidden style="color:var(--danger)">Your name can't be empty.</p>
    <div class="modal__actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit">Save changes</button></div>
  </form>` });
  const form = $('form', m), bio = form.elements.bio, count = $('#bioCount', m);
  const updateCount = () => { count.textContent = `${bio.value.length}/160`; };
  bio.addEventListener('input', updateCount); updateCount();
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-ep]');
    if (!b) return;
    pickImages({ multiple: false }).then(list => {
      if (!list[0]) return;
      if (b.dataset.ep === 'cover') { cover = list[0].src; $('.ep-cover', m).style.backgroundImage = `url('${cover}')`; }
      else { photoSrc = list[0].src; $('#epAvatar', m).innerHTML = avatar({ ...u, photo: photoSrc }, 92); }
    });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) { $('[data-err]', m).hidden = false; form.elements.name.focus(); return; }
    Object.assign(u, { name, bio: bio.value.trim(), location: form.elements.location.value.trim(), hometown: form.elements.hometown.value.trim(), work: form.elements.work.value.trim(), education: form.elements.education.value.trim(), website: form.elements.website.value.trim(), cover });
    if (photoSrc) u.photo = photoSrc;
    closeModal(m); renderChrome(); refresh();
    toast('Profile saved', { icon: 'check' });
  });
}

function showShortcuts() {
  openModal({ title: 'Keyboard shortcuts', className: 'modal--sm', content: `<dl class="kbd-list">
    <div><dt>Search Connect</dt><dd><kbd>/</kbd></dd></div><div><dt>Create a post</dt><dd><kbd>N</kbd></dd></div>
    <div><dt>Close dialogs and menus</dt><dd><kbd>Esc</kbd></dd></div><div><dt>Previous / next photo or story</dt><dd><kbd>←</kbd> <kbd>→</kbd></dd></div>
    <div><dt>Pause a story</dt><dd><kbd>Space</kbd></dd></div><div><dt>Send a message</dt><dd><kbd>Enter</kbd></dd></div><div><dt>New line in a message</dt><dd><kbd>Shift</kbd> + <kbd>Enter</kbd></dd></div></dl>` });
}
async function logout() {
  closeDropdowns();
  const ok = await confirmDialog({ title: 'Log out of Connect?', text: 'You can log back in any time. This demo keeps your session on this device.', confirmText: 'Log out' });
  if (!ok) return;
  const el = document.createElement('div');
  el.className = 'auth-screen';
  el.innerHTML = `<div class="card auth-card">${$('.brand__mark').outerHTML.replace('brand__mark', 'brand__mark" style="width:56px;height:56px')}<h1>See you soon, ${esc(firstName(me()))}</h1><p>You've logged out of Connect.</p><button class="btn btn--primary btn--block" type="button" data-action="login">Log back in as ${esc(me().name)}</button></div>`;
  document.body.append(el);
  $('button', el).focus();
}

/* Search box */
function renderSearchDropdown(q) {
  const dd = $('#dd-search'), t = q.trim();
  if (!t) {
    dd.innerHTML = ui.recent.length
      ? `<div class="sd-head"><span class="sd-title">Recent searches</span><button class="link small" type="button" data-action="clear-recent">Clear</button></div>${ui.recent.map(r => `<button class="sd-item" type="button" data-action="search-go" data-q="${esc(r)}"><span class="sd-ico">${icon('clock', 'icon--sm')}</span><span>${esc(r)}</span></button>`).join('')}`
      : '<p class="sd-empty">Search for people, groups or posts. Accents are optional: “ca phe” finds “cà phê”.</p>';
    return;
  }
  const nq = normalize(t), people = users.filter(u => u.id !== ME && normalize(u.name).includes(nq)).slice(0, 5), gs = groups.filter(g => normalize(g.name).includes(nq)).slice(0, 3);
  dd.innerHTML = `${people.length ? `<div class="sd-title">People</div>${people.map(u => `<a class="sd-item" href="#/profile/${u.id}">${avatar(u, 36, { status: true })}<span class="sd-main"><span class="sd-name">${esc(u.name)}</span><span class="muted small">${esc(relLabel(u))}</span></span></a>`).join('')}` : ''}
    ${gs.length ? `<div class="sd-title">Groups</div>${gs.map(g => `<button class="sd-item" type="button" data-action="open-group" data-group="${g.id}"><img class="sd-thumb" src="${g.cover}" alt=""><span class="sd-main"><span class="sd-name">${esc(g.name)}</span><span class="muted small">${fmtCount(g.members)} members</span></span></button>`).join('')}` : ''}
    <button class="sd-item sd-all" type="button" data-action="search-go" data-q="${esc(t)}"><span class="sd-ico">${icon('search', 'icon--sm')}</span><span>See all results for “<strong>${esc(t)}</strong>”</span></button>`;
  $$('.sd-name', dd).forEach(n => highlight(n, t));
}
function openSearchDropdown() { $('#dd-search').classList.add('is-open'); $('#searchInput').setAttribute('aria-expanded', 'true'); }
function goSearch(q) {
  q = q.trim();
  if (!q) return;
  ui.recent = [q, ...ui.recent.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  store.set('connect:recent', ui.recent);
  $('#searchInput').blur();
  closeDropdowns();
  location.hash = `#/search/${encodeURIComponent(q)}`;
}

/* ---------- 7. Actions & events ---------- */
let longPressed = false, pressTimer = null;

const actions = {
  'dropdown': el => toggleDropdown(el),
  'open-drawer': openDrawer,
  'close-drawer': closeDrawer,
  'open-search': openSearch,
  'close-search': closeSearch,
  'toggle-theme': () => setTheme(isDark() ? 'light' : 'dark'),
  'set-theme': el => setTheme(el.dataset.theme),
  'go-back': () => (history.length > 1 ? history.back() : (location.hash = '#/feed')),
  'scroll-stories': el => $('#storiesTrack')?.scrollBy({ left: +el.dataset.dir * 320, behavior: 'smooth' }),
  'open-story': el => openStoryViewer(+el.dataset.index),
  'add-story': openStoryCreator,
  'open-composer': el => openComposer(el.dataset.mode),
  'feed-filter': el => {
    ui.feedFilter = el.dataset.filter;
    $$('[data-action="feed-filter"]').forEach(c => c.setAttribute('aria-pressed', c === el));
    $('#feedList').innerHTML = feedListHTML();
  },
  'react': el => {
    if (!el.dataset.reaction && longPressed) { longPressed = false; return; }
    reactTo(el.dataset.post, el.dataset.reaction);
  },
  'show-reactions': el => openReactions(el.dataset.post),
  'focus-comment': el => $('.comment-form input', el.closest('.post'))?.focus(),
  'toggle-comments': el => { const p = getPost(el.dataset.post); ui.expanded.has(p.id) ? ui.expanded.delete(p.id) : ui.expanded.add(p.id); refreshComments(p); },
  'like-comment': el => {
    const p = getPost(el.dataset.post), c = p.comments.find(x => x.id === el.dataset.comment);
    c.liked = !c.liked; c.likes += c.liked ? 1 : -1;
    refreshComments(p);
  },
  'reply-comment': el => {
    const p = getPost(el.dataset.post), c = p.comments.find(x => x.id === el.dataset.comment), input = $('.comment-form input', el.closest('.post'));
    input.value = `@${firstName(getUser(c.userId))} `;
    input.focus();
  },
  'delete-comment': el => deleteComment(getPost(el.dataset.post), el.dataset.comment),
  'share': el => openShare(el.dataset.post),
  'save': el => toggleSave(el.dataset.post),
  'post-menu': el => openPostMenu(el),
  'unhide-post': el => { ui.hidden.delete(el.dataset.post); const art = el.closest('.post'); art.outerHTML = postHTML(getPost(el.dataset.post)); },
  'vote': el => vote(el.dataset.post, el.dataset.option),
  'unvote': el => unvote(el.dataset.post),
  'open-lightbox': el => { const p = getPost(el.dataset.post); openLightbox(p.images, +el.dataset.index, p.text); },
  'open-photo': el => openLightbox(ui.photoList, +el.dataset.index),
  'view-image': el => openLightbox([{ src: el.dataset.src, alt: 'Shared photo' }], 0),
  'play-video': el => toggleVideo(el.dataset.post),
  'seek-video': (el, e) => { const r = el.getBoundingClientRect(); seekVideo(el.dataset.post, (e.clientX - r.left) / r.width); },
  'add-friend': el => addFriend(el.dataset.user),
  'cancel-request': el => { rel.requestsOut.delete(el.dataset.user); toast('Friend request cancelled', { icon: 'user-minus' }); afterRelationChange(); },
  'accept-request': el => acceptRequest(el.dataset.user),
  'decline-request': el => declineRequest(el.dataset.user),
  'friend-menu': el => friendMenu(el),
  'dismiss-suggestion': el => { rel.dismissed.add(el.dataset.user); afterRelationChange(); },
  'follow': el => toggleFollow(el.dataset.user),
  'message-user': el => openChatWith(el.dataset.user),
  'send-wish': el => { const u = getUser(el.dataset.user), c = convWith(u.id); ui.prefill = { conv: c.id, text: u.lang === 'vi' ? `Chúc mừng sinh nhật ${firstName(u)}! 🎂🎉` : `Happy birthday, ${firstName(u)}! 🎂🎉` }; openChatWith(u.id); },
  'profile-tab': el => {
    ui.profileTab = el.dataset.tab;
    $$('.tab').forEach(t => { const on = t.dataset.tab === ui.profileTab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    renderProfileTab(getUser(ui.profileId));
    if (el.classList.contains('tab')) el.focus(); else $('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'edit-profile': openEditProfile,
  'change-avatar': () => applyProfilePhoto('avatar'),
  'change-cover': () => applyProfilePhoto('cover'),
  'mark-all-read': el => {
    notifications.forEach(n => { n.read = true; });
    updateBadges();
    if (el.closest('#dd-notifs')) renderNotifDropdown(); else refresh();
    toast('All notifications marked as read', { icon: 'check' });
  },
  'notif-filter': el => { ui.notifFilter = el.dataset.filter; if (el.closest('#dd-notifs')) renderNotifDropdown(); else refresh(); },
  'open-notif': el => {
    const n = notifications.find(x => x.id === el.dataset.id);
    n.read = true;
    updateBadges(); closeDropdowns();
    if (location.hash === n.link) render(); else location.hash = n.link;
  },
  'open-group': el => { closeDropdowns(); openGroup(el.dataset.group); },
  'join-group': el => joinGroup(el.dataset.group),
  'create-group': openCreateGroup,
  'event-status': el => setEventStatus(el.dataset.event, el.dataset.status),
  'events-tab': el => { ui.eventsTab = el.dataset.tab; refresh(); },
  'events-upcoming': () => { ui.eventsTab = 'upcoming'; refresh(); },
  'toggle-setting': el => {
    const k = el.dataset.key;
    settings[k] = !settings[k];
    saveSettings(); applySettings();
    el.setAttribute('aria-checked', settings[k]);
    if (k === 'activeStatus') renderChrome();
    toast(`${el.getAttribute('aria-label')} ${settings[k] ? 'on' : 'off'}`, { icon: 'settings' });
    if (k === 'sounds' && settings[k]) chime();
  },
  'shortcuts': () => { closeDropdowns(); showShortcuts(); },
  'logout': logout,
  'login': el => { el.closest('.auth-screen').remove(); toast(`Welcome back, ${firstName(me())}`, { icon: 'smile' }); },
  'reset-demo': async () => { if (await confirmDialog({ title: 'Reset demo data?', text: 'All posts, comments, messages and friend changes from this session will be undone.', confirmText: 'Reset' })) location.reload(); },
  'new-message': openNewMessage,
  'call': el => startCall(el.dataset.user, !!el.dataset.video),
  'chat-attach': el => { const c = getConv(el.dataset.conv); pickImages().then(list => list.forEach(im => sendMessage(c, { image: im.src }))); },
  'chat-emoji': el => toggleEmojiPop(el),
  'quick-like': el => sendMessage(getConv(el.dataset.conv), { text: '👍' }),
  'search-go': el => goSearch(el.dataset.q),
  'clear-recent': () => { ui.recent = []; store.set('connect:recent', []); renderSearchDropdown(''); },
};

document.addEventListener('click', e => {
  const insidePanel = e.target.closest('.dropdown, [data-action="dropdown"], .search');
  if (!insidePanel) closeDropdowns();
  if (activeMenu && !e.target.closest('.menu') && !activeMenu.anchor.contains(e.target)) closeMenu();
  $$('.react.is-open').forEach(r => { if (!r.contains(e.target)) r.classList.remove('is-open'); });
  if (!e.target.closest('.emoji-pop, [data-action="chat-emoji"]')) $$('.emoji-pop').forEach(p => p.remove());
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  fn(el, e);
});

const forms = {
  comment: f => { const text = f.elements.text.value.trim(); if (text) addComment(getPost(f.dataset.post), text); },
  message: f => {
    const ta = f.elements.text, text = ta.value.trim();
    if (!text) return;
    sendMessage(getConv(f.dataset.conv), { text });
    ta.value = ''; autosize(ta); f.classList.remove('has-text');
    $('.emoji-pop', f)?.remove();
  },
};
document.addEventListener('submit', e => {
  const h = forms[e.target.dataset.form];
  if (!h) return;
  e.preventDefault();
  h(e.target, e);
});

document.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  settings[key] = e.target.value;
  saveSettings();
  toast(`New posts will default to ${PRIVACY[e.target.value].label}`, { icon: PRIVACY[e.target.value].icon });
});

/* Long-press on touch opens the reaction picker */
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.react > .post-action');
  if (!btn || e.pointerType === 'mouse') return;
  longPressed = false;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { longPressed = true; btn.parentElement.classList.add('is-open'); navigator.vibrate?.(12); }, 420);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(ev => document.addEventListener(ev, e => { if (ev !== 'pointermove' || Math.abs(e.movementY) > 4) clearTimeout(pressTimer); }, { passive: true }));
document.addEventListener('contextmenu', e => { if (e.target.closest('.react')) e.preventDefault(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (activeMenu) return closeMenu(true);
    if ($('.emoji-pop')) { $$('.emoji-pop').forEach(p => p.remove()); return; }
    if (modalStack.length) return closeModal();
    if ($('.dropdown.is-open')) { const open = $('.dropdown.is-open'); closeDropdowns(); $(`[aria-controls="${open.id}"]`)?.focus(); return; }
    if (document.body.classList.contains('drawer-open')) return closeDrawer();
    if (document.body.classList.contains('search-open')) return closeSearch();
    $$('.react.is-open').forEach(r => r.classList.remove('is-open'));
  }
  if (e.key === 'Tab' && modalStack.length) trapFocus(e, topModal());
  const typing = e.target.closest('input, textarea, select, [contenteditable="true"]');
  if (!typing && !modalStack.length && !e.metaKey && !e.ctrlKey && !e.altKey && !$('.auth-screen')) {
    if (e.key === '/') { e.preventDefault(); if (matchMedia('(max-width: 560px)').matches) openSearch(); else $('#searchInput').focus(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openComposer(); }
  }
  if (e.target.matches('.chat__composer textarea') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
  if (e.target.matches('.video__track') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    const id = e.target.dataset.post, st = videoState(id), dur = getPost(id).video.duration;
    seekVideo(id, (st.t + (e.key === 'ArrowRight' ? 10 : -10)) / dur);
  }
});

/* Search input */
const searchInput = $('#searchInput');
searchInput.addEventListener('focus', () => { renderSearchDropdown(searchInput.value); openSearchDropdown(); });
searchInput.addEventListener('input', debounce(() => { renderSearchDropdown(searchInput.value); openSearchDropdown(); }, 100));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') goSearch(searchInput.value);
  if (e.key === 'ArrowDown') { e.preventDefault(); $('#dd-search .sd-item')?.focus(); }
});
$('#dd-search').addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = $$('#dd-search .sd-item'), i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') items[Math.min(items.length - 1, i + 1)]?.focus();
  else if (i <= 0) searchInput.focus(); else items[i - 1].focus();
});

window.addEventListener('scroll', () => closeMenu(), { passive: true });
window.addEventListener('resize', debounce(() => {
  closeMenu();
  if (!matchMedia('(max-width: 900px)').matches) closeDrawer();
  if (!matchMedia('(max-width: 560px)').matches) document.body.classList.remove('search-open');
}, 150));

/* ---------- 8. Boot ---------- */
applySettings();
setTheme(isDark() ? 'dark' : 'light');
renderChrome();
render();
scheduleLiveActivity();
