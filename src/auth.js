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

/**
 * تعطيل مؤقت لتسجيل الدخول على مستوى كل الموقع (DISABLE_AUTH=true في .env).
 * عند التفعيل: أي زائر يُعامل تلقائيًا كمدير (صلاحية كاملة على كل الصفحات)
 * دون الحاجة لاسم مستخدم أو كلمة مرور. هذا الخيار مخصص للتجربة السريعة فقط
 * ويجب إلغاؤه (حذف المتغيّر أو ضبطه على false) قبل الاستخدام الفعلي.
 */
function isAuthDisabled() {
  return process.env.DISABLE_AUTH === 'true';
}

function guestManagerUser() {
  return { id: 0, role: 'manager', fullName: 'وضع بدون تسجيل دخول (مؤقت)', username: 'guest' };
}

function requireAuth(req, res, next) {
  if (isAuthDisabled()) {
    req.session.user = req.session.user || guestManagerUser();
    return next();
  }
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
}

/** يسمح بالدخول لصاحب الدور المطلوب أو للمدير (الذي يفتح كل الصفحات) */
function requireRole(...roles) {
  return (req, res, next) => {
    if (isAuthDisabled()) {
      req.session.user = req.session.user || guestManagerUser();
      return next();
    }
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

module.exports = {
  hashPassword,
  verifyPassword,
  requireAuth,
  requireRole,
  referenceCode,
  isAuthDisabled,
  guestManagerUser,
};
