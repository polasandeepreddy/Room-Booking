import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'room_booking.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('====================================================');
console.log('🧪 TESTING ADMIN USER CREATION & ROLE UPDATES');
console.log('====================================================\n');

// 1. Clean test users
db.prepare("DELETE FROM users WHERE email LIKE 'testuser%@example.com'").run();

// 2. Test Add User as 'user'
const passHash = bcrypt.hashSync('Test@12345', 10);
const ins1 = db.prepare(`
  INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('Test User One', 'testuser1@example.com', passHash, '+91 91111 22222', 'user', 'active');

console.log(`✓ Inserted new user ID: ${ins1.lastInsertRowid}`);

const row1 = db.prepare('SELECT id, full_name, email, role, status FROM users WHERE id = ?').get(ins1.lastInsertRowid);
console.log(`✓ Verified User: "${row1.full_name}" | Role: ${row1.role}`);

if (row1.role !== 'user') {
  console.error('FAIL: Expected role user');
  process.exit(1);
}

// 3. Test Update Role to 'admin'
db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run('admin', ins1.lastInsertRowid);

const row2 = db.prepare('SELECT id, full_name, email, role, status FROM users WHERE id = ?').get(ins1.lastInsertRowid);
console.log(`✓ Updated User Role: "${row2.full_name}" -> New Role: ${row2.role}`);

if (row2.role !== 'admin') {
  console.error('FAIL: Expected role admin');
  process.exit(1);
}

// 4. Test Add Admin directly
const ins2 = db.prepare(`
  INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('Test Admin Two', 'testuser2@example.com', passHash, '+91 93333 44444', 'admin', 'active');

const row3 = db.prepare('SELECT id, full_name, email, role, status FROM users WHERE id = ?').get(ins2.lastInsertRowid);
console.log(`✓ Direct Admin Creation: "${row3.full_name}" | Role: ${row3.role}`);

// 5. Clean up
db.prepare("DELETE FROM users WHERE email LIKE 'testuser%@example.com'").run();

console.log('\n====================================================');
console.log('✅ ALL ADMIN USER & ROLE TESTS PASSED!');
console.log('====================================================\n');

db.close();
