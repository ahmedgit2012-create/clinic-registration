'use strict';

const express = require('express');
const router = express.Router();
const { requireRole } = require('../auth');
const bookingsDb = require('../db/bookings');
const slotsLib = require('../slots');

router.use('/endoscopy', requireRole('endoscopy'));

function resolveDate(req) {
  const q = req.query.date || req.body.bookingDate;
  return slotsLib.isValidDateStr(q) ? q : slotsLib.todayStr();
}

router.get('/endoscopy', (req, res) => {
  const date = resolveDate(req);
  const schedule = bookingsDb.getDaySchedule(date).filter((s) => s.isHourly);
  res.render('endoscopy', {
    date,
    schedule,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    error: null,
    success: null,
  });
});

router.post('/endoscopy/book', (req, res) => {
  const date = resolveDate(req);
  const { slotTime, patientName, patientPhone, patientNationalId, notes } = req.body;
  let error = null;
  let success = null;
  try {
    bookingsDb.createBooking({
      bookingDate: date,
      slotTime,
      bookingType: 'endoscopy',
      patientName,
      patientPhone,
      patientNationalId,
      notes,
      source: req.session.user.role === 'manager' ? 'manager' : 'endoscopy_staff',
      createdByUserId: req.session.user.id,
    });
    success = `تم حجز موعد الناظور ${slotTime} للمريض ${patientName} بنجاح.`;
  } catch (err) {
    if (err instanceof bookingsDb.BookingError) {
      error = err.message;
    } else {
      throw err;
    }
  }
  const schedule = bookingsDb.getDaySchedule(date).filter((s) => s.isHourly);
  res.render('endoscopy', {
    date,
    schedule,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    error,
    success,
  });
});

router.post('/endoscopy/cancel/:id', (req, res) => {
  const date = resolveDate(req);
  try {
    bookingsDb.cancelBooking(req.params.id, { requireType: 'endoscopy' });
  } catch (err) {
    if (!(err instanceof bookingsDb.BookingError)) throw err;
  }
  res.redirect(`/endoscopy?date=${encodeURIComponent(date)}`);
});

module.exports = router;
