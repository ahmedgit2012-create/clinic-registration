'use strict';

const express = require('express');
const router = express.Router();
const bookingsDb = require('../db/bookings');
const slotsLib = require('../slots');

function resolveDate(req) {
  const q = req.query.date || req.body.bookingDate;
  if (slotsLib.isValidDateStr(q) && !slotsLib.isPastDate(q)) return q;
  return slotsLib.nextOpenDate(slotsLib.todayStr());
}

router.get('/patient', (req, res) => {
  const date = resolveDate(req);
  const schedule = bookingsDb.getDaySchedule(date);
  res.render('patient', {
    date,
    schedule,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    nextOpenDate: slotsLib.nextOpenDate(date),
    error: null,
    formValues: {},
  });
});

router.post('/patient/book', (req, res) => {
  const date = resolveDate(req);
  const { slotTime, patientName, patientPhone, patientNationalId, notes } = req.body;
  try {
    const booking = bookingsDb.createBooking({
      bookingDate: date,
      slotTime,
      bookingType: 'regular',
      patientName,
      patientPhone,
      patientNationalId,
      notes,
      source: 'patient',
      createdByUserId: null,
    });
    return res.render('patient-confirm', { booking, weekdayName: slotsLib.weekdayName(date) });
  } catch (err) {
    if (!(err instanceof bookingsDb.BookingError)) throw err;
    const schedule = bookingsDb.getDaySchedule(date);
    return res.status(400).render('patient', {
      date,
      schedule,
      weekdayName: slotsLib.weekdayName(date),
      isClosed: slotsLib.isClosedDay(date),
      nextOpenDate: slotsLib.nextOpenDate(date),
      error: err.message,
      formValues: { patientName, patientPhone, patientNationalId, notes },
    });
  }
});

router.get('/patient/lookup', (req, res) => {
  res.render('patient-lookup', { booking: null, error: null, searched: false, cancelled: false });
});

router.post('/patient/lookup', (req, res) => {
  const { referenceCode, patientPhone } = req.body;
  const booking = bookingsDb.findByReferenceAndPhone(referenceCode, patientPhone);
  res.render('patient-lookup', {
    booking,
    error: booking ? null : 'لم يتم العثور على حجز مطابق لرقم المرجع والهاتف المدخلين.',
    searched: true,
    cancelled: false,
  });
});

router.post('/patient/lookup/cancel/:id', (req, res) => {
  const { referenceCode, patientPhone } = req.body;
  const booking = bookingsDb.findByReferenceAndPhone(referenceCode, patientPhone);
  if (booking && String(booking.id) === req.params.id) {
    bookingsDb.cancelBooking(booking.id);
    return res.render('patient-lookup', { booking: null, error: null, searched: false, cancelled: true });
  }
  res.render('patient-lookup', {
    booking: null,
    error: 'تعذر إلغاء الحجز، تأكد من رقم المرجع والهاتف.',
    searched: true,
    cancelled: false,
  });
});

module.exports = router;
