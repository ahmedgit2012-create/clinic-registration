'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'clinic.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('secretary', 'endoscopy', 'manager')),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    booking_type TEXT NOT NULL CHECK (booking_type IN ('regular', 'endoscopy')),
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_national_id TEXT,
    notes TEXT,
    source TEXT NOT NULL CHECK (source IN ('secretary', 'patient', 'endoscopy_staff', 'manager')),
    created_by_user_id INTEGER REFERENCES users(id),
    reference_code TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    cancelled_at TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_active_slot
    ON bookings (booking_date, slot_time)
    WHERE status = 'confirmed';

  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);
`);

module.exports = db;
