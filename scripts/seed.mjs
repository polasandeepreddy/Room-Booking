import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// Auto-load .env in Node.js
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {}
}

const DB_PATH = process.env.DATABASE_PATH || './data/room_booking.db';
const resolvedDbPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH);
const dbDir = path.dirname(resolvedDbPath);

console.log('----------------------------------------------------');
console.log('🌱 SEEDING FOLDER-BASED SQLITE DATABASE');
console.log(`Database Location: [${resolvedDbPath}]`);
console.log('----------------------------------------------------');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(resolvedDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    mobile_number TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS flats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_name TEXT NOT NULL,
    description TEXT NOT NULL,
    max_capacity INTEGER NOT NULL DEFAULT 10,
    status TEXT DEFAULT 'active',
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id INTEGER NOT NULL,
    room_name TEXT NOT NULL,
    room_type TEXT NOT NULL,
    description TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 5,
    status TEXT DEFAULT 'available',
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_rooms_flat_id ON rooms(flat_id);

  CREATE TABLE IF NOT EXISTS facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    flat_id INTEGER NOT NULL,
    check_in_date TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    check_out_time TEXT NOT NULL,
    check_in_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    check_out_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    number_of_persons INTEGER NOT NULL,
    status TEXT DEFAULT 'confirmed',
    special_requests TEXT,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    cancelled_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_flat_id ON bookings(flat_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date, status);
  CREATE INDEX IF NOT EXISTS idx_bookings_datetime_status ON bookings(check_in_at, check_out_at, status);

  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_by TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_at TEXT;");
  } catch (_) {}

  CREATE TABLE IF NOT EXISTS booking_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON booking_rooms(booking_id);
  CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_id ON booking_rooms(room_id);

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

console.log('✅ SQLite Schema verified successfully.');

// Seed Users
const adminPasswordHash = bcrypt.hashSync('Admin@12345', 10);
const guestPasswordHash = bcrypt.hashSync('Guest@12345', 10);

const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@hotel.com');
if (!adminUser) {
  db.prepare(`
    INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
    VALUES (?, ?, ?, ?, 'admin', 'active')
  `).run('Property Administrator', 'admin@hotel.com', adminPasswordHash, '+91 98765 43210');
  console.log('✅ Seeded Admin User: admin@hotel.com / Admin@12345');
}

const guestUser = db.prepare('SELECT id FROM users WHERE email = ?').get('guest@hotel.com');
if (!guestUser) {
  db.prepare(`
    INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
    VALUES (?, ?, ?, ?, 'user', 'active')
  `).run('Guest User', 'guest@hotel.com', guestPasswordHash, '+91 98765 01234');
  console.log('✅ Seeded Guest User: guest@hotel.com / Guest@12345');
}

// Seed Flat
const flatCount = (db.prepare('SELECT COUNT(*) as cnt FROM flats').get()).cnt || 0;
if (flatCount === 0) {
  db.prepare(`
    INSERT INTO flats (id, flat_name, description, max_capacity, status, image_url)
    VALUES (1, ?, ?, 10, 'active', ?)
  `).run(
    'Comfortable 2-Room Flat',
    'A modern, clean, comfortable and secure flat with two spacious double bedrooms, modern bathrooms, fully-equipped kitchen, dining lounge, and high-speed Wi-Fi. Ideal for families, groups, and business travelers seeking peace and convenience.',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80'
  );
  console.log('✅ Seeded Default Flat: Comfortable 2-Room Flat');
}

// Seed Rooms
const roomCount = (db.prepare('SELECT COUNT(*) as cnt FROM rooms').get()).cnt || 0;
if (roomCount === 0) {
  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, flat_id, room_name, room_type, description, capacity, status, image_url)
    VALUES (?, 1, ?, 'Double Bed Room', ?, 5, 'available', ?)
  `);

  insertRoom.run(
    1,
    'Room 1',
    'Spacious master bedroom featuring a plush double bed, premium mattress, private attached bathroom with hot water geyser, silent air conditioning, large acoustic window, and bedside USB charging ports.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'
  );

  insertRoom.run(
    2,
    'Room 2',
    'Cozy second double bedroom furnished with a comfortable double bed, pristine linens, climate-controlled air conditioning, attached ensuite bathroom, reading desk, and high-definition smart television.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
  );

  console.log('✅ Seeded Rooms (Room 1 & Room 2)');
}

// Seed Facilities
const facilityCount = (db.prepare('SELECT COUNT(*) as cnt FROM facilities').get()).cnt || 0;
if (facilityCount === 0) {
  const facilitiesData = [
    ['Free Wi-Fi', 'High-speed optical fiber wireless internet throughout the flat', 'Wifi'],
    ['Air Conditioning', 'Dual inverter climate control in both bedrooms and living area', 'Wind'],
    ['Comfortable Beds', 'Plush orthopedic double beds with crisp 400TC Egyptian cotton linens', 'BedDouble'],
    ['Attached Bathroom', 'Modern private ensuite marble bathrooms with premium fixtures', 'Bath'],
    ['Hot Water', '24/7 continuous hot water with high-pressure instant geysers', 'Flame'],
    ['Television', '55" 4K Smart UHD Television with Netflix & streaming apps', 'Tv'],
    ['Charging Points', 'Multiple bedside international power sockets & fast USB-C ports', 'Zap'],
    ['Drinking Water', 'Complimentary RO-purified fresh drinking water & electric kettle', 'Coffee'],
    ['Clean & Hygienic', 'Professional deep-cleaning & UV sanitization before every guest check-in', 'Sparkles'],
    ['CCTV Security', '24/7 HD security camera surveillance for building entrance and corridors', 'Video'],
    ['24/7 Security', 'Dedicated round-the-clock on-premise security and concierge support', 'ShieldCheck'],
    ['Emergency Support', 'Direct emergency front-desk hotline, fire extinguisher & medical kit', 'HeartPulse'],
    ['Parking', 'Secure covered on-site private car and two-wheeler parking spaces', 'Car'],
    ['Kitchen', 'Fully equipped modular kitchenette with microwave, stove, and refrigerator', 'Utensils'],
    ['Dining Area', 'Dedicated cozy dining table setup for family meals and workspaces', 'Armchair'],
    ['Non-Smoking Area', 'Strictly 100% smoke-free clean environment with fresh air circulation', 'Ban'],
  ];

  const insertFacility = db.prepare('INSERT INTO facilities (name, description, icon, status) VALUES (?, ?, ?, ?)');
  for (const [name, desc, icon] of facilitiesData) {
    insertFacility.run(name, desc, icon, 'active');
  }
  console.log(`✅ Seeded ${facilitiesData.length} property facilities`);
}

// Seed Settings
const settingCount = (db.prepare('SELECT COUNT(*) as cnt FROM settings').get()).cnt || 0;
if (settingCount === 0) {
  const settingsData = [
    ['property_name', 'Comfortable 2-Room Flat'],
    ['property_tagline', 'A clean, comfortable and secure place for your stay.'],
    ['property_description', 'Modern 2-Room Flat offering unmatched comfort, high security, and premium amenities for up to 10 persons.'],
    ['contact_number', '+91 98765 43210'],
    ['contact_email', 'contact@hotel.com'],
    ['property_address', 'Flat 402, Greenfield Residency, City Center, Sector 18'],
    ['max_persons', '10'],
    ['default_check_in_time', '14:00'],
    ['default_check_out_time', '11:00'],
    ['advance_booking_days', '90'],
    ['cancellation_rules', 'Free cancellation up to 24 hours prior to scheduled check-in time.'],
  ];

  const insertSetting = db.prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)');
  for (const [key, val] of settingsData) {
    insertSetting.run(key, val);
  }
  console.log(`✅ Seeded ${settingsData.length} default property settings`);
}

console.log('----------------------------------------------------');
console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
console.log('----------------------------------------------------');
db.close();
