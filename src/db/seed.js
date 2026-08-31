'use strict';

require('dotenv').config();
const crypto = require('crypto');
const db = require('./index');
const { hashPassword } = require('../auth');

function randomPassword() {
  return crypto.randomBytes(6).toString('base64url');
}

const accounts = [
  {
    role: 'secretary',
    username: process.env.SECRETARY_USERNAME || 'secretary',
    full_name: 'موظف الاستقبال',
    password: process.env.SECRETARY_PASSWORD,
  },
  {
    role: 'endoscopy',
    username: process.env.ENDOSCOPY_USERNAME || 'endoscopy',
    full_name: 'موظف النواظير',
    password: process.env.ENDOSCOPY_PASSWORD,
  },
  {
    role: 'manager',
    username: process.env.MANAGER_USERNAME || 'manager',
    full_name: 'مدير العيادة',
    password: process.env.MANAGER_PASSWORD,
  },
];

const existing = db.prepare('SELECT username FROM users').all().map((r) => r.username);
const insert = db.prepare(
  'INSERT INTO users (role, username, password_hash, full_name) VALUES (?, ?, ?, ?)'
);

const generated = [];

for (const acc of accounts) {
  if (existing.includes(acc.username)) continue;
  const password = acc.password || randomPassword();
  insert.run(acc.role, acc.username, hashPassword(password), acc.full_name);
  generated.push({ ...acc, password });
}

if (generated.length) {
  console.log('تم إنشاء الحسابات التالية (احتفظ بها في مكان آمن):');
  console.table(
    generated.map((a) => ({
      الدور: a.role,
      'اسم المستخدم': a.username,
      'كلمة المرور': a.password,
    }))
  );
} else {
  console.log('كل الحسابات موجودة مسبقًا، لم يتم إنشاء أي حساب جديد.');
}
