'use strict';

const express = require('express');
const router = express.Router();
const users = require('../db/users');
const { verifyPassword, isAuthDisabled } = require('../auth');

const ROLE_HOME = {
  secretary: '/secretary',
  endoscopy: '/endoscopy',
  manager: '/manager',
};

router.get('/login', (req, res) => {
  if (isAuthDisabled()) {
    return res.redirect('/manager');
  }
  if (req.session.user) {
    return res.redirect(ROLE_HOME[req.session.user.role] || '/');
  }
  res.render('login', { error: null, username: '' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.findByUsername(username);
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).render('login', {
      error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
      username: username || '',
    });
  }
  req.session.user = { id: user.id, role: user.role, fullName: user.full_name, username: user.username };
  res.redirect(ROLE_HOME[user.role] || '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect(isAuthDisabled() ? '/manager' : '/login'));
});

router.get('/', (req, res) => {
  if (isAuthDisabled()) {
    return res.redirect('/manager');
  }
  if (req.session.user) {
    return res.redirect(ROLE_HOME[req.session.user.role] || '/login');
  }
  res.redirect('/patient');
});

module.exports = router;
