'use strict';

const crypto = require('crypto');

const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const candidateBuf = crypto.scryptSync(password, salt, KEY_LEN);
  if (hashBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, candidateBuf);
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
}

/** يسمح بالدخول لصاحب الدور المطلوب أو للمدير (الذي يفتح كل الصفحات) */
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    if (roles.includes(user.role) || user.role === 'manager') return next();
    return res.status(403).render('error', {
      title: 'وصول مرفوض',
      message: 'لا تملك صلاحية الوصول إلى هذه الصفحة.',
    });
  };
}

function referenceCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

module.exports = { hashPassword, verifyPassword, requireAuth, requireRole, referenceCode };
