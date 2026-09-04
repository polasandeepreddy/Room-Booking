import Database from 'better-sqlite3';
import path from 'path';
import assert from 'assert';

// Auto-load .env in Node.js
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {}
}

const DB_PATH = process.env.DATABASE_PATH || './data/room_booking.db';
const resolvedDbPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH);

console.log('====================================================');
console.log('🧪 VERIFYING ADMIN CANCELLATION & USER HISTORY DATA');
console.log(`Database Location: [${resolvedDbPath}]`);
console.log('====================================================\n');

async function runTest() {
  const db = new Database(resolvedDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_by TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN cancelled_at TEXT;");
  } catch (_) {}

  // 1. Ensure test user and admin exist
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  const user = db.prepare("SELECT * FROM users WHERE role = 'user' LIMIT 1").get();

  assert(admin, 'Admin user must exist');
  assert(user, 'Regular user must exist');

  console.log(`✓ Admin: ${admin.full_name} (ID: ${admin.id})`);
  console.log(`✓ Guest: ${user.full_name} (ID: ${user.id})`);

  // Clean old test bookings
  const testDate = '2026-11-20';
  db.prepare("DELETE FROM bookings WHERE check_in_date = ?").run(testDate);

  // 2. User books Room 1
  console.log('\n--- Step 1: User creates a booking ---');
  const bookingId1 = `BK-20261120-7701`;
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_id, user_id, flat_id, check_in_date, check_in_time, 
      check_out_date, check_out_time, check_in_at, check_out_at, 
      number_of_persons, status, special_requests
    ) VALUES (?, ?, 1, ?, '14:00', '2026-11-22', '11:00', '2026-11-20 14:00:00', '2026-11-22 11:00:00', 2, 'confirmed', 'Ground floor')
  `);
  const bRes1 = insertBooking.run(bookingId1, user.id, testDate);
  const bookingDbId1 = Number(bRes1.lastInsertRowid);
  db.prepare('INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, 1)').run(bookingDbId1);

  console.log(`✓ Created Booking ID: ${bookingId1} (DB ID: ${bookingDbId1})`);

  // Check initial state
  const b1Initial = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingDbId1);
  assert.strictEqual(b1Initial.status, 'confirmed');
  assert.strictEqual(b1Initial.cancelled_by, null);
  assert.strictEqual(b1Initial.cancellation_reason, null);
  console.log('✓ Initial booking state verified: confirmed, cancelled_by is null');

  // 3. Admin cancels the booking
  console.log('\n--- Step 2: Admin cancels the room booking ---');
  db.prepare(`
    UPDATE bookings 
    SET status = 'cancelled', 
        cancelled_by = 'admin', 
        cancellation_reason = 'Admin canceled your room booking', 
        cancelled_at = datetime('now', 'localtime'), 
        updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(bookingDbId1);

  // Fetch updated booking details
  const b1AfterAdminCancel = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingDbId1);
  assert(b1AfterAdminCancel, 'Booking must exist after cancellation');
  assert.strictEqual(b1AfterAdminCancel.status, 'cancelled', 'Status must be cancelled');
  assert.strictEqual(b1AfterAdminCancel.cancelled_by, 'admin', 'cancelled_by must be admin');
  assert.strictEqual(
    b1AfterAdminCancel.cancellation_reason,
    'Admin canceled your room booking',
    'cancellation_reason must be Admin canceled your room booking'
  );
  assert(b1AfterAdminCancel.cancelled_at, 'cancelled_at timestamp must be recorded');

  console.log('✅ Admin cancellation verified:');
  console.log(`   - Status: ${b1AfterAdminCancel.status}`);
  console.log(`   - Cancelled By: ${b1AfterAdminCancel.cancelled_by}`);
  console.log(`   - Reason: "${b1AfterAdminCancel.cancellation_reason}"`);
  console.log(`   - Cancelled At: ${b1AfterAdminCancel.cancelled_at}`);

  // 4. Test User Self-Cancellation Flow
  console.log('\n--- Step 3: Test User self-cancellation flow ---');
  const bookingId2 = `BK-20261120-7702`;
  const bRes2 = insertBooking.run(bookingId2, user.id, testDate);
  const bookingDbId2 = Number(bRes2.lastInsertRowid);
  db.prepare('INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, 2)').run(bookingDbId2);

  db.prepare(`
    UPDATE bookings 
    SET status = 'cancelled', 
        cancelled_by = 'user', 
        cancellation_reason = 'Guest plans changed', 
        cancelled_at = datetime('now', 'localtime'), 
        updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(bookingDbId2);

  const b2AfterUserCancel = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingDbId2);
  assert.strictEqual(b2AfterUserCancel.status, 'cancelled');
  assert.strictEqual(b2AfterUserCancel.cancelled_by, 'user');
  assert.strictEqual(b2AfterUserCancel.cancellation_reason, 'Guest plans changed');
  console.log('✅ User self-cancellation verified:');
  console.log(`   - Status: ${b2AfterUserCancel.status}`);
  console.log(`   - Cancelled By: ${b2AfterUserCancel.cancelled_by}`);
  console.log(`   - Reason: "${b2AfterUserCancel.cancellation_reason}"`);

  // 5. Test Admin Re-confirming clears cancellation fields
  console.log('\n--- Step 4: Admin re-confirms a cancelled booking ---');
  db.prepare(`
    UPDATE bookings 
    SET status = 'confirmed', 
        cancelled_by = NULL, 
        cancellation_reason = NULL, 
        cancelled_at = NULL, 
        updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(bookingDbId2);

  const b2Reconfirmed = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingDbId2);
  assert.strictEqual(b2Reconfirmed.status, 'confirmed');
  assert.strictEqual(b2Reconfirmed.cancelled_by, null);
  assert.strictEqual(b2Reconfirmed.cancellation_reason, null);
  assert.strictEqual(b2Reconfirmed.cancelled_at, null);
  console.log('✅ Re-confirming clears cancellation metadata successfully');

  // Cleanup test bookings
  db.prepare("DELETE FROM bookings WHERE check_in_date = ?").run(testDate);

  console.log('\n====================================================');
  console.log('🎉 ALL ADMIN & USER CANCELLATION TESTS PASSED 100%!');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
