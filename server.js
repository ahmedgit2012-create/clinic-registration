'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

require('./src/db'); // تهيئة قاعدة البيانات والجداول

const authRoutes = require('./src/routes/auth');
const secretaryRoutes = require('./src/routes/secretary');
const endoscopyRoutes = require('./src/routes/endoscopy');
const patientRoutes = require('./src/routes/patient');
const managerRoutes = require('./src/routes/manager');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src', 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clinic-registration-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 ساعات
      httpOnly: true,
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use(authRoutes);
app.use(secretaryRoutes);
app.use(endoscopyRoutes);
app.use(patientRoutes);
app.use(managerRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'الصفحة غير موجودة', message: 'الصفحة المطلوبة غير موجودة.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'خطأ في الخادم', message: 'حدث خطأ غير متوقع، الرجاء المحاولة لاحقًا.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`نظام تسجيل العيادة يعمل على http://localhost:${PORT}`);
});
