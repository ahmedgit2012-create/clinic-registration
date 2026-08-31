'use strict';

const express = require('express');
const router = express.Router();
const { requireRole } = require('../auth');
const bookingsDb = require('../db/bookings');
const usersDb = require('../db/users');
const slotsLib = require('../slots');

router.use('/manager', requireRole('manager'));

function resolveDate(req) {
  const q = req.query.date || req.body.bookingDate;
  return slotsLib.isValidDateStr(q) ? q : slotsLib.todayStr();
}

router.get('/manager', (req, res) => {
  const date = resolveDate(req);
  const schedule = bookingsDb.getDaySchedule(date);
  const stats = bookingsDb.getStatsForDate(date);
  res.render('manager', {
    date,
    schedule,
    stats,
    weekdayName: slotsLib.weekdayName(date),
    isClosed: slotsLib.isClosedDay(date),
    message: null,
  });
});

router.post('/manager/cancel/:id', (req, res) => {
  const date = resolveDate(req);
  try {
    bookingsDb.cancelBooking(req.params.id);
  } catch (err) {
    if (!(err instanceof bookingsDb.BookingError)) throw err;
  }
  res.redirect(`/manager?date=${encodeURIComponent(date)}`);
});

router.get('/manager/accounts', (req, res) => {
  res.render('manager-accounts', { staff: usersDb.listStaff(), message: null, error: null });
});

router.post('/manager/accounts/:id/password', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).render('manager-accounts', {
      staff: usersDb.listStaff(),
      message: null,
      error: 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل.',
    });
  }
  usersDb.updatePassword(req.params.id, newPassword);
  res.render('manager-accounts', {
    staff: usersDb.listStaff(),
    message: 'تم تحديث كلمة المرور بنجاح.',
    error: null,
  });
});

module.exports = router;
