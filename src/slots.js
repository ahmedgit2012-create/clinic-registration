'use strict';

/**
 * قواعد جدول الحجز:
 * - العيادة تعمل يوميًا من 5:00 مساءً حتى 9:00 مساءً، فيما عدا الأربعاء والجمعة.
 * - الحجز العام (السكرتير / المريض) كل ربع ساعة: مريض واحد لكل موعد.
 * - حجز مواعيد النواظير كل ساعة كاملة (5، 6، 7، 8)، ويتداخل مع الحجز العام:
 *   أي أن موعد الساعة الكاملة يُستخدم إمّا لحجز عام وإمّا لحجز ناظور، وليس كليهما.
 */

const OPEN_HOUR = 17; // 5:00 PM
const CLOSE_HOUR = 21; // 9:00 PM (exclusive)
const SLOT_MINUTES = 15;
const CLOSED_WEEKDAYS = new Set([3, 5]); // 3=Wednesday, 5=Friday (JS Date#getDay)

const WEEKDAY_NAMES_AR = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** يحول "YYYY-MM-DD" إلى كائن Date بتوقيت محلي بدون انزياح منطقة زمنية */
function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isValidDateStr(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
  const d = parseDateOnly(dateStr);
  return !Number.isNaN(d.getTime());
}

function weekdayName(dateStr) {
  return WEEKDAY_NAMES_AR[parseDateOnly(dateStr).getDay()];
}

function isClosedDay(dateStr) {
  return CLOSED_WEEKDAYS.has(parseDateOnly(dateStr).getDay());
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function isPastDate(dateStr) {
  return dateStr < todayStr();
}

/** كل الأوقات المتاحة لليوم (ربع ساعة): ['17:00', '17:15', ..., '20:45'] */
function allSlotTimes() {
  const times = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      times.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return times;
}

function isHourlySlot(time) {
  return time.endsWith(':00');
}

/** الأوقات الصالحة لحجز الناظور فقط (كل ساعة كاملة) */
function hourlySlotTimes() {
  return allSlotTimes().filter(isHourlySlot);
}

/** أقرب تاريخ متاح (غير مغلق) ابتداءً من التاريخ المعطى */
function nextOpenDate(fromDateStr) {
  let d = parseDateOnly(fromDateStr);
  for (let i = 0; i < 14; i += 1) {
    const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (!CLOSED_WEEKDAYS.has(d.getDay())) return dateStr;
    d.setDate(d.getDate() + 1);
  }
  return fromDateStr;
}

module.exports = {
  OPEN_HOUR,
  CLOSE_HOUR,
  SLOT_MINUTES,
  CLOSED_WEEKDAYS,
  WEEKDAY_NAMES_AR,
  parseDateOnly,
  isValidDateStr,
  weekdayName,
  isClosedDay,
  todayStr,
  isPastDate,
  allSlotTimes,
  isHourlySlot,
  hourlySlotTimes,
  nextOpenDate,
};
