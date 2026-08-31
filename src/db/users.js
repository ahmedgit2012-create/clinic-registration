'use strict';

const db = require('./index');
const { hashPassword } = require('../auth');

function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function listStaff() {
  return db
    .prepare("SELECT id, role, username, full_name, created_at FROM users WHERE role != 'manager' ORDER BY role")
    .all();
}

function updatePassword(id, newPassword) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), id);
}

module.exports = { findByUsername, findById, listStaff, updatePassword };
