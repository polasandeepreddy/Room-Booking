import Database from 'better-sqlite3';
import path from 'path';

// Auto-load .env in Node.js
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {}
}

const DB_PATH = process.env.DATABASE_PATH || './data/room_booking.db';
const resolvedDbPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH);
const BASE_URL = 'http://localhost:3000';

console.log('================================================================');
console.log('🧪 TESTING 30-DAY AUTO-RETENTION & BOOKING CLEANUP SYSTEM');
console.log(`Database Location: [${resolvedDbPath}]`);
console.log('================================================================\n');

async function runTests() {
  const getDbConn = () => {
    const conn = new Database(resolvedDbPath);
    conn.pragma('journal_mode = WAL');
    conn.pragma('foreign_keys = ON');
    return conn;
  };

  const formatDate = (date) => date.toISOString().split('T')[0];
  const now = new Date();

  // Test dates
  const d45DaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const d44DaysAgo = new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000);

  const d32DaysAgo = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000);
  const d31DaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  const d20DaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const d19DaysAgo = new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000);

  const dToday = new Date(now.getTime());
  const dTomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  const dFuture1 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const dFuture2 = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  // Clean old test artifacts
  let db = getDbConn();
  db.prepare("DELETE FROM bookings WHERE booking_id LIKE 'BK-TEST-RET-%'").run();
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();

  // 1. Log in as Admin to get auth cookie
  console.log('1. Authenticating as Admin...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@hotel.com',
      password: 'Admin@12345',
    }),
  });

  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.success) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('✅ Admin authenticated successfully.');

  // 2. Insert test bookings directly in SQLite
  console.log('\n2. Seeding test bookings with past, current, and future dates...');
  db = getDbConn();
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_id, user_id, flat_id, 
      check_in_date, check_in_time, check_out_date, check_out_time, 
      check_in_at, check_out_at, number_of_persons, status, created_at
    ) VALUES (?, 1, 1, ?, '14:00', ?, '11:00', ?, ?, 2, 'completed', ?)
  `);

  const insertBookingRoom = db.prepare(`
    INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, 1)
  `);

  const testBookings = [
    { id: 'BK-TEST-RET-45D', in: formatDate(d45DaysAgo), out: formatDate(d44DaysAgo), shouldPurge: true },
    { id: 'BK-TEST-RET-32D', in: formatDate(d32DaysAgo), out: formatDate(d31DaysAgo), shouldPurge: true },
    { id: 'BK-TEST-RET-20D', in: formatDate(d20DaysAgo), out: formatDate(d19DaysAgo), shouldPurge: false },
    { id: 'BK-TEST-RET-TODAY', in: formatDate(dToday), out: formatDate(dTomorrow), shouldPurge: false },
    { id: 'BK-TEST-RET-FUTURE', in: formatDate(dFuture1), out: formatDate(dFuture2), shouldPurge: false },
  ];

  for (const b of testBookings) {
    const res = insertBooking.run(
      b.id,
      b.in,
      b.out,
      `${b.in} 14:00:00`,
      `${b.out} 11:00:00`,
      `${b.in} 10:00:00`
    );
    insertBookingRoom.run(res.lastInsertRowid);
  }
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  console.log('✅ Seeded 5 test bookings (45D old, 32D old, 20D old, Today, Future).');

  // 3. Test on-demand Cleanup Endpoint: POST /api/admin/bookings/cleanup
  console.log('\n3. Testing Admin Cleanup API: POST /api/admin/bookings/cleanup...');
  const cleanupRes = await fetch(`${BASE_URL}/api/admin/bookings/cleanup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ days: 30 }),
  });

  const cleanupData = await cleanupRes.json();
  console.log('Response:', cleanupData);
  if (!cleanupRes.ok || !cleanupData.success) {
    throw new Error(`Cleanup endpoint failed: ${JSON.stringify(cleanupData)}`);
  }
  if (cleanupData.deletedCount < 2) {
    throw new Error(`Expected at least 2 bookings deleted, got ${cleanupData.deletedCount}`);
  }
  console.log(`✅ Cleanup API successfully purged ${cleanupData.deletedCount} old bookings.`);

  // 4. Verify database state for all 5 bookings
  console.log('\n4. Verifying database retention state...');
  db = getDbConn();
  for (const b of testBookings) {
    const row = db.prepare('SELECT id, booking_id FROM bookings WHERE booking_id = ?').get(b.id);
    const rooms = row ? db.prepare('SELECT * FROM booking_rooms WHERE booking_id = ?').all(row.id) : [];

    if (b.shouldPurge) {
      if (row) {
        throw new Error(`Failure: ${b.id} was expected to be deleted, but is still present.`);
      }
      console.log(`  ✓ Successfully purged: ${b.id}`);
    } else {
      if (!row) {
        throw new Error(`Failure: ${b.id} was expected to be preserved, but was deleted.`);
      }
      if (rooms.length === 0) {
        throw new Error(`Failure: ${b.id} relational rooms were corrupted.`);
      }
      console.log(`  ✓ Correctly preserved: ${b.id} (with room assigned)`);
    }
  }
  db.close();

  // 5. Test Auto-Purge when Admin fetches Bookings: GET /api/admin/bookings
  console.log('\n5. Testing Automatic Purge on Admin Bookings GET request...');
  db = getDbConn();
  const insertAuto = db.prepare(`
    INSERT INTO bookings (
      booking_id, user_id, flat_id, 
      check_in_date, check_in_time, check_out_date, check_out_time, 
      check_in_at, check_out_at, number_of_persons, status, created_at
    ) VALUES (?, 1, 1, ?, '14:00', ?, '11:00', ?, ?, 2, 'completed', ?)
  `);
  const insertAutoRoom = db.prepare(`
    INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, 1)
  `);

  const bResAuto = insertAuto.run(
    'BK-TEST-RET-AUTO40D',
    formatDate(d45DaysAgo),
    formatDate(d44DaysAgo),
    `${formatDate(d45DaysAgo)} 14:00:00`,
    `${formatDate(d44DaysAgo)} 11:00:00`,
    `${formatDate(d45DaysAgo)} 10:00:00`
  );
  insertAutoRoom.run(bResAuto.lastInsertRowid);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();

  const getBookingsRes = await fetch(`${BASE_URL}/api/admin/bookings`, {
    headers: { Cookie: adminCookie },
  });
  const getBookingsData = await getBookingsRes.json();
  if (!getBookingsRes.ok || !getBookingsData.success) {
    throw new Error(`GET /api/admin/bookings failed: ${JSON.stringify(getBookingsData)}`);
  }

  db = getDbConn();
  const autoCheck = db.prepare("SELECT id FROM bookings WHERE booking_id = 'BK-TEST-RET-AUTO40D'").get();
  if (autoCheck) {
    throw new Error('Auto-purge on GET /api/admin/bookings failed: 40D booking still exists.');
  }
  db.close();
  console.log('✅ Verified GET /api/admin/bookings automatically purges data older than 30 days before returning.');

  // 6. Test Single Booking Deletion: DELETE /api/admin/bookings/[id]
  console.log('\n6. Testing Single Booking Deletion API: DELETE /api/admin/bookings/[id]...');
  db = getDbConn();
  const row20D = db.prepare("SELECT id FROM bookings WHERE booking_id = 'BK-TEST-RET-20D'").get();
  db.close();

  const delSingleRes = await fetch(`${BASE_URL}/api/admin/bookings/${row20D.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const delSingleData = await delSingleRes.json();
  console.log('Response:', delSingleData);
  if (!delSingleRes.ok || !delSingleData.success) {
    throw new Error(`DELETE /api/admin/bookings/${row20D.id} failed: ${JSON.stringify(delSingleData)}`);
  }

  db = getDbConn();
  const check20D = db.prepare("SELECT id FROM bookings WHERE booking_id = 'BK-TEST-RET-20D'").get();
  if (check20D) {
    throw new Error('Single booking delete failed: row still exists.');
  }
  db.prepare("DELETE FROM bookings WHERE booking_id LIKE 'BK-TEST-RET-%'").run();
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  console.log('✅ Single booking delete verified.');

  console.log('\n================================================================');
  console.log('🎉 ALL 30-DAY AUTO-RETENTION & CLEANUP TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
