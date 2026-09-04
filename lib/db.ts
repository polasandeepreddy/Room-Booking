import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let dbInstance: Database.Database | null = null;
let isInitialized = false;

/**
 * Resolves the SQLite database file path.
 * Defaults to ./data/room_booking.db inside the project folder.
 */
function getDbPath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }
  return path.join(process.cwd(), 'data', 'room_booking.db');
}

/**
 * Normalizes SQL queries by stripping MySQL-specific syntax (e.g. FOR UPDATE)
 * and mapping NOW() to SQLite datetime functions.
 */
function normalizeSql(sql: string): string {
  return sql
    .replace(/\bFOR\s+UPDATE\b/gi, '')
    .replace(/\bNOW\(\)/gi, "datetime('now', 'localtime')")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now', 'localtime')")
    .trim();
}

/**
 * Initializes SQLite schema and seeds initial mock data if empty.
 */
function initializeSchemaAndSeed(db: Database.Database): void {
  // 1. Users table
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
  `);

  // 2. Flats table
  db.exec(`
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
  `);

  // 3. Rooms table
  db.exec(`
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
  `);

  // 4. Facilities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 5. Bookings table
  db.exec(`
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
  `);

  // Migrate existing tables if columns are missing
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_by TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_at TEXT;");
  } catch (_) {}

  // 6. Booking Rooms relational table
  db.exec(`
    CREATE TABLE IF NOT EXISTS booking_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON booking_rooms(booking_id);
    CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_id ON booking_rooms(room_id);
  `);

  // 7. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed default data if empty
  seedInitialData(db);
}

/**
 * Seeds initial mock data and property defaults.
 */
function seedInitialData(db: Database.Database): void {
  // 1. Seed Demo Users if missing
  const adminPasswordHash = bcrypt.hashSync('Admin@12345', 10);
  const guestPasswordHash = bcrypt.hashSync('Guest@12345', 10);

  const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@hotel.com');
  if (!adminUser) {
    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
      VALUES (?, ?, ?, ?, 'admin', 'active')
    `).run('Property Administrator', 'admin@hotel.com', adminPasswordHash, '+91 98765 43210');
  }

  const guestUser = db.prepare('SELECT id FROM users WHERE email = ?').get('guest@hotel.com');
  if (!guestUser) {
    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
      VALUES (?, ?, ?, ?, 'user', 'active')
    `).run('Guest User', 'guest@hotel.com', guestPasswordHash, '+91 98765 01234');
  }

  // 2. Seed Flat (1 Flat)
  const flatCount = (db.prepare('SELECT COUNT(*) as count FROM flats').get() as { count: number })?.count || 0;
  if (flatCount === 0) {
    db.prepare(`
      INSERT INTO flats (id, flat_name, description, max_capacity, status, image_url)
      VALUES (1, ?, ?, 10, 'active', ?)
    `).run(
      'Comfortable 2-Room Flat',
      'A modern, clean, comfortable and secure flat with two spacious double bedrooms, modern bathrooms, fully-equipped kitchen, dining lounge, and high-speed Wi-Fi. Ideal for families, groups, and business travelers seeking peace and convenience.',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80'
    );
  }

  // 3. Seed Rooms (2 Rooms inside Flat 1)
  const roomCount = (db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number })?.count || 0;
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
  }

  // 4. Seed Facilities
  const facilityCount = (db.prepare('SELECT COUNT(*) as count FROM facilities').get() as { count: number })?.count || 0;
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
  }

  // 5. Seed Settings
  const settingCount = (db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number })?.count || 0;
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
  }
}

const globalForDb = globalThis as unknown as {
  __dbInstance?: Database.Database;
};

/**
 * Returns the initialized SQLite Database singleton instance.
 */
export function getDb(): Database.Database {
  if (!globalForDb.__dbInstance) {
    const dbFilePath = getDbPath();
    const dbDir = path.dirname(dbFilePath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbFilePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    initializeSchemaAndSeed(db);
    globalForDb.__dbInstance = db;
  }

  return globalForDb.__dbInstance;
}

/**
 * Compatibility alias for getDb
 */
export async function getPool(): Promise<Database.Database> {
  return getDb();
}

/**
 * Execute a query returning an array of rows.
 * Automatically handles data modifications if non-reader SQL is passed.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  const cleanSql = normalizeSql(sql);
  const stmt = db.prepare(cleanSql);
  const cleanParams = Array.isArray(params) ? params : [params];
  if (stmt.reader) {
    return (cleanParams.length > 0 ? stmt.all(...cleanParams) : stmt.all()) as T[];
  }
  const info = cleanParams.length > 0 ? stmt.run(...cleanParams) : stmt.run();
  return [
    {
      changes: info.changes,
      lastInsertRowid: Number(info.lastInsertRowid),
      insertId: Number(info.lastInsertRowid),
    } as unknown as T,
  ];
}

/**
 * Execute a query returning a single row or null.
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const db = getDb();
  const cleanSql = normalizeSql(sql);
  const stmt = db.prepare(cleanSql);
  const cleanParams = Array.isArray(params) ? params : [params];
  if (!stmt.reader) {
    if (cleanParams.length > 0) stmt.run(...cleanParams);
    else stmt.run();
    return null;
  }
  const result = cleanParams.length > 0 ? stmt.get(...cleanParams) : stmt.get();
  return (result as T) || null;
}

export interface ExecuteResult {
  insertId: number;
  affectedRows: number;
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement.
 */
export async function execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
  const db = getDb();
  const cleanSql = normalizeSql(sql);
  const stmt = db.prepare(cleanSql);
  const cleanParams = Array.isArray(params) ? params : [params];
  const info = cleanParams.length > 0 ? stmt.run(...cleanParams) : stmt.run();
  return {
    insertId: Number(info.lastInsertRowid),
    affectedRows: info.changes,
  };
}

export interface DbTransactionConnection {
  query<T = any>(sql: string, params?: any[]): Promise<[T[]]>;
  execute(sql: string, params?: any[]): Promise<[ExecuteResult]>;
}

/**
 * Runs a transactional workflow with automatic commit and rollback.
 * Supplies a connection interface compatible with query/execute syntax.
 */
export async function withTransaction<T>(
  callback: (connection: DbTransactionConnection) => Promise<T>
): Promise<T> {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');

  const connection: DbTransactionConnection = {
    async query<R = any>(sql: string, params: any[] = []): Promise<[R[]]> {
      const cleanSql = normalizeSql(sql);
      const stmt = db.prepare(cleanSql);
      const cleanParams = Array.isArray(params) ? params : [params];
      if (stmt.reader) {
        const rows = (cleanParams.length > 0 ? stmt.all(...cleanParams) : stmt.all()) as R[];
        return [rows];
      }
      const info = cleanParams.length > 0 ? stmt.run(...cleanParams) : stmt.run();
      return [
        [
          {
            changes: info.changes,
            lastInsertRowid: Number(info.lastInsertRowid),
            insertId: Number(info.lastInsertRowid),
          } as unknown as R,
        ],
      ];
    },
    async execute(sql: string, params: any[] = []): Promise<[ExecuteResult]> {
      const cleanSql = normalizeSql(sql);
      const cleanParams = Array.isArray(params) ? params : [params];
      const info = cleanParams.length > 0 ? db.prepare(cleanSql).run(...cleanParams) : db.prepare(cleanSql).run();
      const result: ExecuteResult = {
        insertId: Number(info.lastInsertRowid),
        affectedRows: info.changes,
      };
      return [result];
    },
  };


  try {
    const result = await callback(connection);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors if already rolled back
    }
    throw error;
  }
}
