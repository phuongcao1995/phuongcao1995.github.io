/* =========================================================
   Hotel business rules. All modules mutate data through here
   so availability, folio maths and room status stay consistent.
   ========================================================= */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util;
  const D = () => HMS.store.data;
  const H = (HMS.hotel = {});

  H.ROOM_STATUSES = ['Available', 'Reserved', 'Occupied', 'Dirty', 'Cleaning', 'Clean', 'Inspected', 'Maintenance', 'Out of Order', 'Out of Service'];
  H.RES_STATUSES = ['Pending', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled', 'No-show'];
  H.BLOCKED = ['Maintenance', 'Out of Order', 'Out of Service'];
  H.READY = ['Available', 'Inspected', 'Reserved', 'Clean'];
  H.PAY_METHODS = () => Object.keys(D().settings.paymentMethods).filter((k) => D().settings.paymentMethods[k]);
  H.CHARGE_CATS = ['Restaurant', 'Minibar', 'Laundry', 'Spa', 'Transport', 'Tours', 'Room', 'F&B', 'Leisure', 'Events', 'Other'];

  /* ---------- Lookups ---------- */
  H.type = (id) => D().roomTypes.find((t) => t.id === id);
  H.typeName = (id) => (H.type(id) || {}).name || id;
  H.room = (id) => D().rooms.find((r) => r.id === id);
  H.guest = (id) => D().guests.find((g) => g.id === id);
  H.guestName = (id) => (H.guest(id) || {}).name || '—';
  H.res = (id) => D().reservations.find((r) => r.id === id);
  H.customer = (id) => D().customers.find((c) => c.id === id);
  H.plan = (id) => D().ratePlans.find((p) => p.id === id);
  H.nights = (ci, co) => Math.max(0, U.diffDays(ci, co));
  H.roomLabel = (id) => { const r = H.room(id); return r ? `${r.number} · ${H.typeName(r.typeId)}` : 'Unassigned'; };

  /** Reservations that hold inventory on their dates */
  const holds = (r) => !['Cancelled', 'No-show'].includes(r.status);
  const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  /* ---------- Availability (rule: no overlapping bookings per room) ---------- */
  H.conflicts = (roomId, ci, co, excludeId) => D().reservations.filter((r) =>
    r.roomId === roomId && r.id !== excludeId && holds(r) && overlaps(ci, co, r.checkIn, r.checkOut));
  H.isBlocked = (room) => !room || room.disabled || H.BLOCKED.includes(room.status);
  H.isFree = (roomId, ci, co, excludeId) => !H.isBlocked(H.room(roomId)) && H.conflicts(roomId, ci, co, excludeId).length === 0;
  H.availableRooms = (ci, co, typeId, excludeId, opt = {}) => D().rooms.filter((room) => {
    if (typeId && room.typeId !== typeId) return false;
    if (H.isBlocked(room)) return false;
    if (opt.readyNow && !H.READY.includes(room.status)) return false;
    return H.conflicts(room.id, ci, co, excludeId).length === 0;
  });
  H.occupant = (roomId) => D().reservations.find((r) => r.roomId === roomId && r.status === 'Checked-in');
  H.arrivalFor = (roomId, d = U.today()) => D().reservations.find((r) => r.roomId === roomId && r.checkIn === d && ['Confirmed', 'Pending'].includes(r.status));

  /* ---------- Rates & promotions ---------- */
  H.rateFor = (typeId, planId, roomId) => {
    const room = roomId && H.room(roomId);
    const base = room ? room.rate : (H.type(typeId) || {}).rate || 0;
    const p = H.plan(planId) || { adjust: 'pct', value: 0 };
    return p.adjust === 'add' ? base + p.value : U.round(base * (1 + p.value / 100), 10000);
  };
  H.promoStatus = (p) => {
    const t = U.today();
    if (!p.enabled) return 'Paused';
    if (p.end < t) return 'Expired';
    if (p.start > t) return 'Scheduled';
    return 'Active';
  };
  /** Validate a coupon and compute its discount on the room charge */
  H.applyPromo = (code, { typeId, nights, roomCharge }) => {
    if (!code) return { amount: 0 };
    const p = D().promotions.find((x) => x.code.toUpperCase() === String(code).toUpperCase());
    if (!p) return { error: `Promotion code ${code} does not exist.` };
    const st = H.promoStatus(p);
    if (st !== 'Active') return { error: `${p.code} is ${st.toLowerCase()}.` };
    if (p.roomTypes.length && !p.roomTypes.includes(typeId)) return { error: `${p.code} is not valid for ${H.typeName(typeId)}.` };
    if (nights < p.minNights) return { error: `${p.code} requires at least ${p.minNights} nights.` };
    let amount = p.discountType === 'percent' ? roomCharge * p.value / 100 : p.value;
    if (p.maxDiscount) amount = Math.min(amount, p.maxDiscount);
    return { promo: p, amount: U.round(amount, 1000) };
  };

  /* ---------- Folio (rule: total = subtotal + tax − discount; balance = total − payments) ---------- */
  H.charges = (resId) => D().charges.filter((c) => c.reservationId === resId);
  H.payments = (resId) => D().payments.filter((p) => p.reservationId === resId);
  H.folio = (r, opt = {}) => {
    const s = D().settings;
    const checkOut = opt.checkOut || r.checkOut;
    const nights = Math.max(1, H.nights(r.checkIn, checkOut));
    const roomCharge = r.rate * nights;
    const charges = H.charges(r.id);
    const byCat = {};
    charges.forEach((c) => { byCat[c.category] = (byCat[c.category] || 0) + c.amount; });
    const extras = U.sum(charges, (c) => c.amount);
    const subtotal = roomCharge + extras;
    const service = Math.round(subtotal * (s.serviceCharge || 0) / 100);
    const vat = Math.round((subtotal + service) * s.vatRate / 100);
    const discount = Math.round(opt.discount != null ? opt.discount : r.discount || 0);
    const total = subtotal + service + vat - discount;
    const pays = H.payments(r.id).filter((p) => p.status !== 'Pending' || p.method === 'City Ledger');
    const paid = U.sum(pays.filter((p) => p.method !== 'City Ledger'), (p) => p.amount);
    const ledger = U.sum(pays.filter((p) => p.method === 'City Ledger'), (p) => p.amount);
    const deposit = U.sum(pays.filter((p) => p.type === 'Deposit'), (p) => p.amount);
    return { nights, roomCharge, charges, byCat, extras, subtotal, service, vat, discount, total, paid, ledger, deposit, balance: total - paid - ledger };
  };
  H.paymentStatus = (r) => {
    if (['Cancelled', 'No-show'].includes(r.status)) return H.payments(r.id).some((p) => p.amount < 0) ? 'Refunded' : '—';
    const f = H.folio(r);
    if (f.balance <= 0) return f.ledger > 0 ? 'City Ledger' : 'Paid';
    return f.paid > 0 ? 'Partially Paid' : 'Unpaid';
  };

  /* ---------- Notifications log ---------- */
  H.notify = (type, text, link = '') => {
    const d = D();
    d.notifications.unshift({ id: 'N' + (++d.counters.notif), type, text, time: U.nowStamp(), link, read: false });
    d.notifications = d.notifications.slice(0, 40);
  };
  H.user = () => (HMS.app && HMS.app.user && HMS.app.user.name) || 'System';

  /* ---------- Reservations ---------- */
  /** Returns an error message or '' */
  H.validateReservation = (x, existing) => {
    const today = U.today();
    if (!x.guestId) return 'Select or create a guest.';
    if (!x.checkIn || !x.checkOut) return 'Enter check-in and check-out dates.';
    if (x.checkOut <= x.checkIn) return 'Check-out date must be after the check-in date.';
    const alreadyIn = existing && existing.status === 'Checked-in';
    if (!alreadyIn && x.checkIn < today) return 'Check-in date cannot be in the past.';
    if (!(x.adults >= 1)) return 'At least one adult is required.';
    if (x.roomId) {
      const room = H.room(x.roomId);
      if (!room) return 'Selected room does not exist.';
      if (room.typeId !== x.roomTypeId) return `Room ${room.number} is not a ${H.typeName(x.roomTypeId)}.`;
      if (H.isBlocked(room)) return `Room ${room.number} is ${room.disabled ? 'disabled' : room.status.toLowerCase()} and cannot be reserved.`;
      const occ = H.occupant(room.id);
      if (occ && (!existing || occ.id !== existing.id) && x.checkIn < occ.checkOut) return `Room ${room.number} is occupied by ${H.guestName(occ.guestId)} until ${U.fmtDate(occ.checkOut)}.`;
      const c = H.conflicts(room.id, x.checkIn, x.checkOut, existing && existing.id);
      if (c.length) return `Room ${room.number} is already booked ${U.fmtDate(c[0].checkIn)}–${U.fmtDate(c[0].checkOut)} (${c[0].id}).`;
      if (x.adults > room.capacity + 1) return `Room ${room.number} sleeps ${room.capacity} (+1 extra bed).`;
    }
    return '';
  };
  /** Room status follows the arrival: an assigned, clean room arriving today becomes Reserved */
  function syncArrivalStatus(roomId) {
    const room = H.room(roomId);
    if (!room) return;
    const arr = H.arrivalFor(roomId);
    if (arr && ['Available', 'Inspected'].includes(room.status)) room.status = 'Reserved';
    if (!arr && room.status === 'Reserved' && !H.occupant(roomId)) room.status = 'Available';
  }
  H.syncArrivalStatus = syncArrivalStatus;

  H.createReservation = (x) => {
    const err = H.validateReservation(x);
    if (err) throw new Error(err);
    const d = D();
    const r = {
      id: HMS.store.nextId('reservation', 'RSV-', 5), guestId: x.guestId, roomId: x.roomId || '', roomTypeId: x.roomTypeId,
      checkIn: x.checkIn, checkOut: x.checkOut, adults: Number(x.adults) || 1, children: Number(x.children) || 0,
      source: x.source || 'Direct', ratePlan: x.ratePlan || 'BAR', rate: Number(x.rate) || H.rateFor(x.roomTypeId, x.ratePlan, x.roomId),
      status: x.status || 'Confirmed', customerId: x.customerId || '', specialRequests: x.specialRequests || '', notes: x.notes || '',
      discount: Number(x.discount) || 0, promoCode: x.promoCode || '', createdAt: U.nowStamp(), groupId: '', eta: x.eta || '', createdBy: H.user()
    };
    d.reservations.push(r);
    if (Number(x.deposit) > 0) H.recordPayment({ reservationId: r.id, amount: Number(x.deposit), method: x.depositMethod || 'Bank Transfer', type: 'Deposit', notes: 'Deposit at booking' });
    if (r.roomId) syncArrivalStatus(r.roomId);
    H.notify('reservation', `New reservation ${r.id} for ${H.guestName(r.guestId)} (${r.source})`, `#/reservations/${r.id}`);
    HMS.store.commit();
    return r;
  };
  H.updateReservation = (id, x) => {
    const r = H.res(id);
    if (!r) throw new Error('Reservation not found.');
    if (['Checked-out', 'Cancelled', 'No-show'].includes(r.status)) throw new Error(`A ${r.status.toLowerCase()} reservation cannot be edited.`);
    const merged = Object.assign({}, r, x);
    if (r.status === 'Checked-in' && merged.checkIn !== r.checkIn) throw new Error('Check-in date cannot change after the guest has checked in.');
    const err = H.validateReservation(merged, r);
    if (err) throw new Error(err);
    const oldRoom = r.roomId;
    if (r.status === 'Checked-in' && merged.roomId !== oldRoom) throw new Error('Use Room transfer to move an in-house guest.');
    Object.assign(r, x, { updatedAt: U.nowStamp() });
    if (oldRoom) syncArrivalStatus(oldRoom);
    if (r.roomId) syncArrivalStatus(r.roomId);
    HMS.store.commit();
    return r;
  };
  H.setReservationStatus = (id, status, reason = '') => {
    const r = H.res(id);
    if (!r) throw new Error('Reservation not found.');
    const allowed = { Confirmed: ['Pending'], Cancelled: ['Pending', 'Confirmed'], 'No-show': ['Pending', 'Confirmed'], Pending: ['Confirmed'] };
    if (!(allowed[status] || []).includes(r.status)) throw new Error(`Cannot change a ${r.status} reservation to ${status}.`);
    if (status === 'No-show' && r.checkIn > U.today()) throw new Error('No-show can only be recorded on or after the arrival date.');
    r.status = status;
    if (status === 'Cancelled') { r.cancelReason = reason || 'Cancelled by front desk'; r.cancelledAt = U.nowStamp(); }
    if (r.roomId) syncArrivalStatus(r.roomId);
    H.notify('reservation', `${r.id} marked ${status}`, `#/reservations/${r.id}`);
    HMS.store.commit();
    return r;
  };

  /* ---------- Guests ---------- */
  H.createGuest = (g) => {
    if (!g.name) throw new Error('Guest name is required.');
    const guest = Object.assign({ gender: '', nationality: 'Vietnam', dob: '', phone: '', email: '', address: '', idType: 'CCCD', idNumber: '', vip: false, type: 'Individual', preferences: [], notes: '', company: '' }, g, { id: HMS.store.nextId('guest', 'G', 5), createdAt: U.today() });
    D().guests.push(guest);
    HMS.store.commit();
    return guest;
  };

  /* ---------- Charges & payments ---------- */
  H.postCharge = (resId, { category, description, qty = 1, unitPrice, date, time }) => {
    const r = H.res(resId);
    if (!r || r.status !== 'Checked-in') throw new Error('Charges can only be posted to an in-house (checked-in) guest.');
    if (!(unitPrice >= 0) || !(qty > 0)) throw new Error('Enter a valid quantity and price.');
    const c = { id: HMS.store.nextId('charge', 'CHG', 6), reservationId: resId, date: date || U.today(), time: time || U.nowStamp().slice(11), category, description, qty: Number(qty), unitPrice: Number(unitPrice), amount: Math.round(qty * unitPrice), postedBy: H.user() };
    D().charges.push(c);
    HMS.store.commit();
    return c;
  };
  H.recordPayment = ({ reservationId = '', invoiceId = '', guestId, amount, method, reference, type = 'Payment', status = 'Paid', notes = '' }) => {
    if (!amount) throw new Error('Enter an amount.');
    const r = reservationId && H.res(reservationId);
    const auto = method === 'Cash' || method === 'City Ledger' ? '' : method === 'Bank Transfer' ? 'FT' + Date.now().toString().slice(-12) : method === 'QR Payment' ? 'VNPAY' + Date.now().toString().slice(-10) : method === 'E-wallet' ? 'MOMO' + Date.now().toString().slice(-9) : '**** ' + String(Math.floor(1000 + Math.random() * 9000));
    const p = { id: HMS.store.nextId('payment', 'PAY-', 5), reservationId, invoiceId, guestId: guestId || (r ? r.guestId : ''), amount: Math.round(amount), method, date: U.nowStamp(), reference: reference || auto, status: method === 'City Ledger' ? 'Pending' : status, type, notes, cashier: H.user() };
    D().payments.push(p);
    HMS.store.commit();
    return p;
  };
  H.refund = (paymentId, amount, reason) => {
    const p = D().payments.find((x) => x.id === paymentId);
    if (!p || p.amount <= 0) throw new Error('Only a received payment can be refunded.');
    const already = -U.sum(D().payments.filter((x) => x.refundOf === p.id), (x) => x.amount);
    if (amount <= 0 || amount > p.amount - already) throw new Error(`Refund must be between 1 and ${U.money(p.amount - already)}.`);
    const rf = H.recordPayment({ reservationId: p.reservationId, invoiceId: p.invoiceId, guestId: p.guestId, amount: -amount, method: p.method, type: 'Refund', status: 'Refunded', notes: reason || 'Refund' });
    rf.refundOf = p.id;
    if (already + amount >= p.amount) p.status = 'Refunded';
    HMS.store.commit();
    return rf;
  };

  /* ---------- Check-in ---------- */
  H.checkIn = (resId, { roomId, guestPatch, deposit = 0, depositMethod = 'Cash', services = [], extraGuests = '', requests } = {}) => {
    const r = H.res(resId);
    const today = U.today();
    if (!r) throw new Error('Reservation not found.');
    if (!['Confirmed', 'Pending'].includes(r.status)) throw new Error(`Reservation is ${r.status}.`);
    if (r.checkIn > today) throw new Error(`Arrival is on ${U.fmtDate(r.checkIn)}. Modify the dates to check in early.`);
    const rid = roomId || r.roomId;
    const room = H.room(rid);
    if (!room) throw new Error('Assign a room before check-in.');
    if (H.isBlocked(room)) throw new Error(`Room ${room.number} is ${room.status}.`);
    if (room.status === 'Occupied' || H.occupant(rid)) throw new Error(`Room ${room.number} is occupied.`);
    if (D().settings.blockDirtyCheckin && !H.READY.includes(room.status)) throw new Error(`Room ${room.number} is ${room.status}. It must be clean before check-in.`);
    const c = H.conflicts(rid, r.checkIn < today ? today : r.checkIn, r.checkOut, r.id);
    if (c.length) throw new Error(`Room ${room.number} is booked by ${c[0].id} during this stay.`);
    if (r.roomId && r.roomId !== rid) { const old = r.roomId; r.roomId = rid; syncArrivalStatus(old); }
    r.roomId = rid; r.roomTypeId = room.typeId;
    if (r.checkIn < today) r.checkIn = today;
    if (guestPatch) Object.assign(H.guest(r.guestId), guestPatch);
    if (extraGuests) r.extraGuests = extraGuests;
    if (requests != null) r.specialRequests = requests;
    r.status = 'Checked-in';
    r.checkedInAt = U.nowStamp();
    r.checkedInBy = H.user();
    room.status = 'Occupied';
    services.forEach((s) => H.postCharge(r.id, s));
    if (deposit > 0) H.recordPayment({ reservationId: r.id, amount: deposit, method: depositMethod, type: 'Deposit', notes: 'Deposit at check-in' });
    H.notify('checkin', `${H.guestName(r.guestId)} checked in to room ${room.number}`, `#/frontdesk`);
    HMS.store.commit();
    return r;
  };

  /* ---------- Check-out (rule: room becomes Dirty and goes to housekeeping) ---------- */
  H.checkOut = (resId, { discount, method = 'Cash', reference = '', buyerCompany = '', buyerTaxId = '' } = {}) => {
    const r = H.res(resId);
    if (!r || r.status !== 'Checked-in') throw new Error('Only checked-in guests can check out.');
    const today = U.today();
    if (r.checkOut > today) { r.originalCheckOut = r.checkOut; r.checkOut = U.addDays(r.checkIn, Math.max(1, H.nights(r.checkIn, today))); }
    if (discount != null) r.discount = Math.max(0, Number(discount) || 0);
    const f = H.folio(r);
    if (r.discount > f.subtotal) throw new Error('Discount cannot exceed the subtotal.');
    const d = D();
    const invId = `INV-${today.slice(0, 4)}-${String(++d.counters.invoice).padStart(6, '0')}`;
    if (f.balance > 0) H.recordPayment({ reservationId: r.id, invoiceId: invId, amount: f.balance, method, reference, type: 'Payment', notes: 'Settlement at check-out' });
    else if (f.balance < 0) H.recordPayment({ reservationId: r.id, invoiceId: invId, amount: f.balance, method, type: 'Refund', status: 'Refunded', notes: 'Deposit refund at check-out' });
    H.payments(r.id).forEach((p) => { if (!p.invoiceId) p.invoiceId = invId; });
    const fin = H.folio(r);
    d.invoices.push({ id: invId, reservationId: r.id, guestId: r.guestId, customerId: r.customerId, date: today, nights: fin.nights, total: fin.total, subtotal: fin.subtotal, status: method === 'City Ledger' && f.balance > 0 ? 'Unpaid' : 'Paid', buyerCompany, buyerTaxId, dueDate: method === 'City Ledger' ? U.addDays(today, 30) : today, issuedBy: H.user() });
    r.status = 'Checked-out';
    r.checkedOutAt = U.nowStamp();
    const room = H.room(r.roomId);
    if (room) {
      room.status = 'Dirty';
      room.attendant = '';
      room.hkPriority = H.arrivalFor(room.id) ? 'High' : 'Normal';
    }
    H.notify('housekeeping', `Room ${room ? room.number : ''} needs cleaning after check-out`, '#/housekeeping');
    HMS.store.commit();
    return { reservation: r, invoiceId: invId };
  };

  /* ---------- Room transfer / extend / late checkout ---------- */
  H.transferRoom = (resId, newRoomId, reason = '') => {
    const r = H.res(resId);
    if (!r || !['Checked-in', 'Confirmed', 'Pending'].includes(r.status)) throw new Error('This reservation cannot be moved.');
    if (newRoomId === r.roomId) throw new Error('Choose a different room.');
    const room = H.room(newRoomId);
    const today = U.today();
    const from = r.status === 'Checked-in' ? today : r.checkIn;
    if (H.isBlocked(room)) throw new Error(`Room ${room.number} is ${room.status}.`);
    const c = H.conflicts(newRoomId, from, r.checkOut, r.id);
    if (c.length) throw new Error(`Room ${room.number} is booked by ${c[0].id} (${U.fmtDate(c[0].checkIn)}–${U.fmtDate(c[0].checkOut)}).`);
    if (r.status === 'Checked-in') {
      if (!H.READY.includes(room.status)) throw new Error(`Room ${room.number} is ${room.status}. Move guests into a clean room.`);
      const old = H.room(r.roomId);
      if (old) { old.status = 'Dirty'; old.hkPriority = 'High'; }
      room.status = 'Occupied';
    }
    const oldId = r.roomId;
    r.transfers = (r.transfers || []).concat({ from: oldId, to: newRoomId, at: U.nowStamp(), reason });
    r.roomId = newRoomId;
    r.roomTypeId = room.typeId;
    if (oldId) syncArrivalStatus(oldId);
    syncArrivalStatus(newRoomId);
    H.notify('frontdesk', `${r.id} moved from room ${oldId || '—'} to ${room.number}`, '#/frontdesk');
    HMS.store.commit();
    return r;
  };
  /** Move dates (calendar drag) keeping the stay length */
  H.moveReservation = (resId, roomId, newCheckIn) => {
    const r = H.res(resId);
    if (!r) throw new Error('Reservation not found.');
    if (r.status === 'Checked-in') {
      if (newCheckIn !== r.checkIn) throw new Error('In-house stays can only change room, not arrival date.');
      return H.transferRoom(resId, roomId, 'Moved on calendar');
    }
    if (!['Confirmed', 'Pending'].includes(r.status)) throw new Error(`${r.status} reservations cannot be moved.`);
    const n = H.nights(r.checkIn, r.checkOut);
    const room = H.room(roomId);
    const typeChanged = room.typeId !== r.roomTypeId;
    return H.updateReservation(resId, { roomId, roomTypeId: room.typeId, checkIn: newCheckIn, checkOut: U.addDays(newCheckIn, n), rate: typeChanged ? H.rateFor(room.typeId, r.ratePlan, roomId) : r.rate });
  };
  H.extendStay = (resId, newCheckOut) => {
    const r = H.res(resId);
    if (!r || !['Checked-in', 'Confirmed', 'Pending'].includes(r.status)) throw new Error('This stay cannot be extended.');
    if (newCheckOut <= r.checkIn) throw new Error('Check-out date must be after check-in.');
    if (r.roomId) {
      const c = H.conflicts(r.roomId, r.checkIn, newCheckOut, r.id);
      if (c.length) throw new Error(`Room ${r.roomId} is booked from ${U.fmtDate(c[0].checkIn)} (${c[0].id}). Transfer the guest to extend.`);
    }
    const old = r.checkOut;
    r.checkOut = newCheckOut;
    H.notify('frontdesk', `${r.id} stay changed: check-out ${U.fmtDate(old)} → ${U.fmtDate(newCheckOut)}`, '#/frontdesk');
    HMS.store.commit();
    return r;
  };

  /* ---------- Room status (rule: Available only after cleaning/inspection) ---------- */
  const FLOW = {
    Dirty: ['Cleaning', 'Maintenance', 'Out of Order'],
    Cleaning: ['Clean', 'Dirty'],
    Clean: ['Inspected', 'Available', 'Dirty'],
    Inspected: ['Available', 'Dirty'],
    Available: ['Dirty', 'Maintenance', 'Out of Order', 'Out of Service'],
    Reserved: ['Dirty', 'Maintenance'],
    Occupied: [],
    Maintenance: ['Dirty'],
    'Out of Order': ['Dirty'],
    'Out of Service': ['Dirty']
  };
  H.nextStatuses = (room) => {
    let list = FLOW[room.status] || [];
    if (D().settings.requireInspection && room.status === 'Clean') list = list.filter((s) => s !== 'Available');
    return list;
  };
  H.setRoomStatus = (roomId, status, opt = {}) => {
    const room = H.room(roomId);
    if (!room) throw new Error('Room not found.');
    if (room.status === status) return room;
    if (room.status === 'Occupied') throw new Error(`Room ${room.number} is occupied. Check the guest out first.`);
    if (!opt.force && !H.nextStatuses(room).includes(status)) {
      if (status === 'Available' && room.status === 'Reserved') throw new Error(`Room ${room.number} is held for today's arrival.`);
      if (status === 'Available') throw new Error(`Room ${room.number} must be cleaned${D().settings.requireInspection ? ' and inspected' : ''} before it can be released.`);
      throw new Error(`Room ${room.number} cannot go from ${room.status} to ${status}.`);
    }
    if (H.BLOCKED.includes(status)) {
      const upcoming = H.arrivalFor(room.id);
      if (upcoming && !opt.force) throw new Error(`Room ${room.number} has an arrival today (${upcoming.id}). Move it first.`);
    }
    room.status = status;
    if (status === 'Cleaning') room.hkStarted = U.nowStamp();
    if (status === 'Clean' || status === 'Inspected') { room.lastCleaned = U.nowStamp(); }
    if (status === 'Inspected') room.inspectedBy = H.user();
    if (status === 'Available' || status === 'Inspected') { room.hkPriority = 'Normal'; if (status === 'Available') room.attendant = ''; }
    if (status === 'Available' || status === 'Inspected') syncArrivalStatus(room.id);
    HMS.store.commit();
    return room;
  };

  /* ---------- Queries ---------- */
  H.inHouse = () => D().reservations.filter((r) => r.status === 'Checked-in');
  H.arrivals = (d = U.today()) => D().reservations.filter((r) => r.checkIn === d && ['Pending', 'Confirmed', 'Checked-in'].includes(r.status) && (r.status !== 'Checked-in' || (r.checkedInAt || '').startsWith(d)));
  H.departures = (d = U.today()) => D().reservations.filter((r) => r.checkOut === d && (r.status === 'Checked-in' || (r.status === 'Checked-out' && (r.checkedOutAt || '').startsWith(d))));

  /** Rooms sold on a night and their revenue (in-house/past + confirmed forecast) */
  H.nightStats = (d, forecast) => {
    const list = D().reservations.filter((r) => r.checkIn <= d && d < r.checkOut && (['Checked-in', 'Checked-out'].includes(r.status) || (forecast && ['Confirmed', 'Pending'].includes(r.status))));
    return { sold: list.length, revenue: U.sum(list, (r) => r.rate), list };
  };
  H.revenueOn = (d) => {
    const room = H.nightStats(d).revenue;
    const ch = D().charges.filter((c) => c.date === d);
    const fnb = U.sum(ch.filter((c) => ['Restaurant', 'Minibar', 'F&B'].includes(c.category)), (c) => c.amount)
      + U.sum(D().orders.filter((o) => o.status === 'Paid' && !o.reservationId && (o.paidAt || '').startsWith(d)), (o) => o.total);
    const other = U.sum(ch.filter((c) => !['Restaurant', 'Minibar', 'F&B'].includes(c.category)), (c) => c.amount);
    return { room, fnb, other, total: room + fnb + other };
  };
  H.kpis = () => {
    const d = D(), today = U.today();
    const rooms = d.rooms.filter((r) => !r.disabled);
    const count = (list) => rooms.filter((r) => list.includes(r.status)).length;
    const occupied = count(['Occupied']);
    const total = rooms.length;
    const night = H.nightStats(today);
    const rev = H.revenueOn(today);
    const adr = night.sold ? night.revenue / night.sold : 0;
    return {
      total, occupied, available: count(['Available', 'Inspected', 'Clean']), reserved: count(['Reserved']),
      dirty: count(['Dirty', 'Cleaning']), maintenance: count(H.BLOCKED),
      arrivals: H.arrivals(today).length, arrivalsPending: H.arrivals(today).filter((r) => r.status !== 'Checked-in').length,
      departures: H.departures(today).length, departuresPending: H.departures(today).filter((r) => r.status === 'Checked-in').length,
      bookingsToday: d.reservations.filter((r) => (r.createdAt || '').startsWith(today)).length,
      occupancy: total ? (occupied / total) * 100 : 0, adr, revpar: total ? night.revenue / total : 0,
      revenue: rev.total, revenueSplit: rev, inHouseGuests: U.sum(H.inHouse(), (r) => r.adults + r.children)
    };
  };

  /** Live notifications derived from current state + event log */
  H.notifications = () => {
    const d = D(), n = d.settings.notif, k = H.kpis(), out = [];
    const today = U.today();
    if (n.arrivals && k.arrivalsPending) out.push({ id: 'live-arr', type: 'checkin', text: `${k.arrivalsPending} guests arriving today`, link: '#/frontdesk', time: `${today}T06:00` });
    if (n.arrivals && k.departuresPending) out.push({ id: 'live-dep', type: 'checkout', text: `${k.departuresPending} check-outs due by ${d.settings.checkOutTime}`, link: '#/frontdesk/departures', time: `${today}T07:00` });
    if (n.housekeeping) d.rooms.filter((r) => r.status === 'Dirty' && r.hkPriority === 'High').slice(0, 3).forEach((r) => out.push({ id: 'live-hk-' + r.id, type: 'housekeeping', text: `Room ${r.number} needs cleaning before today's arrival`, link: '#/housekeeping', time: `${today}T08:00` }));
    if (n.maintenance) d.rooms.filter((r) => H.BLOCKED.includes(r.status)).slice(0, 2).forEach((r) => out.push({ id: 'live-mt-' + r.id, type: 'maintenance', text: `Room ${r.number} is ${r.status.toLowerCase()}`, link: '#/maintenance', time: `${today}T08:10` }));
    if (n.inventory) d.inventory.filter((i) => i.stock <= i.min).slice(0, 3).forEach((i) => out.push({ id: 'live-inv-' + i.id, type: 'inventory', text: `Low inventory: ${i.name} (${i.stock} ${i.unit} left)`, link: '#/inventory', time: `${today}T05:00` }));
    if (n.payments) { const od = d.invoices.filter((i) => i.status === 'Unpaid' && i.dueDate < today).length; if (od) out.push({ id: 'live-od', type: 'payment', text: `${od} company invoices are overdue`, link: '#/finance', time: `${today}T05:30` }); }
    const log = n.reservations ? d.notifications : d.notifications.filter((x) => x.type !== 'reservation');
    return log.concat(out).map((x) => Object.assign({}, x, { read: x.read || d.readNotifs.includes(x.id) })).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  };
})();
