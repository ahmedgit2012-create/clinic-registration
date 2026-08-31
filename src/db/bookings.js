'use strict';

const db = require('./index');
const { referenceCode } = require('../auth');
const slots = require('../slots');

class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** يتحقق من صلاحية التاريخ للحجز: تنسيق صحيح، ليس في الماضي، وليس يوم إغلاق */
function assertBookableDate(dateStr) {
  if (!slots.isValidDateStr(dateStr)) {
    throw new BookingError('invalid_date', 'صيغة التاريخ غير صحيحة.');
  }
  if (slots.isPastDate(dateStr)) {
    throw new BookingError('past_date', 'لا يمكن الحجز في تاريخ سابق.');
  }
  if (slots.isClosedDay(dateStr)) {
    throw new BookingError(
      'closed_day',
      `العيادة مغلقة يوم ${slots.weekdayName(dateStr)} (الأربعاء والجمعة عطلة).`
    );
  }
}

/**
 * يبني جدول مواعيد اليوم كاملاً مع حالة كل موعد (شاغر / محجوز عام / محجوز ناظور)
 */
function getDaySchedule(dateStr) {
  const rows = db
    .prepare(
      `SELECT * FROM bookings WHERE booking_date = ? AND status = 'confirmed' ORDER BY slot_time`
    )
    .all(dateStr);
  const byTime = new Map(rows.map((r) => [r.slot_time, r]));

  return slots.allSlotTimes().map((time) => ({
    time,
    isHourly: slots.isHourlySlot(time),
    booking: byTime.get(time) || null,
  }));
}

function listBookingsForDate(dateStr, type) {
  const query = type
    ? db.prepare(
        `SELECT * FROM bookings WHERE booking_date = ? AND booking_type = ? AND status = 'confirmed' ORDER BY slot_time`
      )
    : db.prepare(
        `SELECT * FROM bookings WHERE booking_date = ? AND status = 'confirmed' ORDER BY slot_time`
      );
  return type ? query.all(dateStr, type) : query.all(dateStr);
}

const insertStmt = db.prepare(`
  INSERT INTO bookings (
    booking_date, slot_time, booking_type, patient_name, patient_phone,
    patient_national_id, notes, source, created_by_user_id, reference_code
  ) VALUES (@booking_date, @slot_time, @booking_type, @patient_name, @patient_phone,
    @patient_national_id, @notes, @source, @created_by_user_id, @reference_code)
`);

/**
 * ينشئ حجزًا جديدًا. يرمي BookingError عند فشل التحقق أو عند تعارض الموعد
 * (يعتمد على القيد الفريد في قاعدة البيانات لمنع تعارض السباق بين طلبين متزامنين).
 */
function createBooking({
  bookingDate,
  slotTime,
  bookingType,
  patientName,
  patientPhone,
  patientNationalId,
  notes,
  source,
  createdByUserId,
}) {
  assertBookableDate(bookingDate);

  if (!slots.allSlotTimes().includes(slotTime)) {
    throw new BookingError('invalid_time', 'الوقت المطلوب غير متاح ضمن جدول العيادة.');
  }
  if (bookingType === 'endoscopy' && !slots.isHourlySlot(slotTime)) {
    throw new BookingError(
      'invalid_endoscopy_time',
      'مواعيد النواظير تُحجز فقط عند بداية كل ساعة كاملة.'
    );
  }
  if (!['regular', 'endoscopy'].includes(bookingType)) {
    throw new BookingError('invalid_type', 'نوع الحجز غير معروف.');
  }
  const name = String(patientName || '').trim();
  const phone = String(patientPhone || '').trim();
  if (!name) throw new BookingError('missing_name', 'الرجاء إدخال اسم المريض.');
  if (!phone) throw new BookingError('missing_phone', 'الرجاء إدخال رقم هاتف المريض.');

  const code = referenceCode();
  try {
    const info = insertStmt.run({
      booking_date: bookingDate,
      slot_time: slotTime,
      booking_type: bookingType,
      patient_name: name,
      patient_phone: phone,
      patient_national_id: patientNationalId ? String(patientNationalId).trim() : null,
      notes: notes ? String(notes).trim() : null,
      source,
      created_by_user_id: createdByUserId || null,
      reference_code: code,
    });
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new BookingError('slot_taken', 'هذا الموعد محجوز بالفعل، الرجاء اختيار موعد آخر.');
    }
    throw err;
  }
}

function cancelBooking(id, { requireType } = {}) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking || booking.status !== 'confirmed') {
    throw new BookingError('not_found', 'الحجز غير موجود أو ملغى مسبقًا.');
  }
  if (requireType && booking.booking_type !== requireType) {
    throw new BookingError('wrong_type', 'لا يمكن إلغاء هذا الحجز من هذه الصفحة.');
  }
  db.prepare(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`
  ).run(id);
  return booking;
}

function findByReferenceAndPhone(referenceCodeInput, phone) {
  return db
    .prepare(
      `SELECT * FROM bookings WHERE reference_code = ? AND patient_phone = ? AND status = 'confirmed'`
    )
    .get(String(referenceCodeInput || '').trim().toUpperCase(), String(phone || '').trim());
}

function getStatsForDate(dateStr) {
  const schedule = getDaySchedule(dateStr);

  const regularTotal = slots.allSlotTimes().length;
  const regularBooked = schedule.filter((s) => s.booking && s.booking.booking_type === 'regular').length;
  const endoscopyTotal = slots.hourlySlotTimes().length;
  const endoscopyBooked = schedule.filter((s) => s.booking && s.booking.booking_type === 'endoscopy').length;

  return {
    closed: slots.isClosedDay(dateStr),
    regularTotal,
    regularBooked,
    regularAvailable: regularTotal - regularBooked - endoscopyBooked,
    endoscopyTotal,
    endoscopyBooked,
    endoscopyAvailable: endoscopyTotal - endoscopyBooked,
  };
}

module.exports = {
  BookingError,
  assertBookableDate,
  getDaySchedule,
  listBookingsForDate,
  createBooking,
  cancelBooking,
  findByReferenceAndPhone,
  getStatsForDate,
};
