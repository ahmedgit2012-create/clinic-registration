'use strict';

const express = require('express');
const router = express.Router();
const { requireRole } = require('../auth');
const bookingsDb = require('../db/bookings');
const slotsLib = require('../slots');

router.use('/secretary', requireRole('secretary'));

function resolveDate(req) {
  const q = req.query.date || req.body.bookingDate;
  return slotsLib.isValidDateStr(q) ? q : slotsLib.todayStr();
}

router.get('/secretary', (req, res) => {
  const date = resolveDate(req);
  const schedule = bookingsDb.getDaySchedule(date);
  res.render('secretary', {
    date,
    schedule,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    error: null,
    success: null,
  });
});

router.post('/secretary/book', (req, res) => {
  const date = resolveDate(req);
  const { slotTime, patientName, patientPhone, patientNationalId, notes } = req.body;
  let error = null;
  let success = null;
  try {
    bookingsDb.createBooking({
      bookingDate: date,
      slotTime,
      bookingType: 'regular',
      patientName,
      patientPhone,
      patientNationalId,
      notes,
      source: req.session.user.role === 'manager' ? 'manager' : 'secretary',
      createdByUserId: req.session.user.id,
    });
    success = `تم حجز الموعد ${slotTime} للمريض ${patientName} بنجاح.`;
  } catch (err) {
    if (err instanceof bookingsDb.BookingError) {
      error = err.message;
    } else {
      throw err;
    }
  }
  const schedule = bookingsDb.getDaySchedule(date);
  res.render('secretary', {
    date,
    schedule,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    error,
    success,
  });
});

router.post('/secretary/cancel/:id', (req, res) => {
  const date = resolveDate(req);
  try {
    bookingsDb.cancelBooking(req.params.id, { requireType: 'regular' });
  } catch (err) {
    if (!(err instanceof bookingsDb.BookingError)) throw err;
  }
  res.redirect(`/secretary?date=${encodeURIComponent(date)}`);
});

module.exports = router;
