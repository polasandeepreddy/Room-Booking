import mysql from 'mysql2/promise';

// Auto-load .env in Node.js
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {}
}

const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'room_booking_db';

console.log('----------------------------------------------------');
console.log('🧪 RUNNING COMPREHENSIVE MYSQL SYSTEM VERIFICATION');
console.log(`Connecting as [${DB_USER}] to [${DB_HOST}:${DB_PORT}]...`);
console.log('----------------------------------------------------');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runVerification() {
  // 1. Ensure database exists
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  // 2. Connect to database
  const db = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  assert(true, 'Connected to MySQL server and selected database successfully');

  // 1. Check Property Structure: 1 Flat, 2 Rooms, max capacity 10
  const [flats] = await db.query('SELECT * FROM flats');
  assert(flats.length === 1, `Database contains exactly 1 flat (found: ${flats.length})`);
  assert(flats[0].max_capacity === 10, `Flat max capacity is 10 (found: ${flats[0].max_capacity})`);

  const [rooms] = await db.query('SELECT * FROM rooms WHERE flat_id = 1 ORDER BY id ASC');
  assert(rooms.length === 2, `Flat contains exactly 2 rooms (found: ${rooms.length})`);
  assert(rooms[0].room_name === 'Room 1' && rooms[0].room_type === 'Double Bed Room', 'Room 1 is Double Bed Room');
  assert(rooms[1].room_name === 'Room 2' && rooms[1].room_type === 'Double Bed Room', 'Room 2 is Double Bed Room');

  // 2. Check Facilities: All required facilities present
  const [facilities] = await db.query('SELECT * FROM facilities');
  assert(facilities.length >= 14, `Facilities seeded properly (found: ${facilities.length})`);

  // 3. Test Double Booking & Overlap Prevention Logic
  const checkOverlap = async (flatId, roomIds, reqCheckIn, reqCheckOut) => {
    const placeholders = roomIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `
      SELECT b.booking_id, br.room_id, r.room_name
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      JOIN rooms r ON br.room_id = r.id
      WHERE b.flat_id = ?
        AND br.room_id IN (${placeholders})
        AND b.status IN ('confirmed', 'pending')
        AND CONCAT(b.check_in_date, 'T', b.check_in_time, ':00') < ?
        AND CONCAT(b.check_out_date, 'T', b.check_out_time, ':00') > ?
    `,
      [flatId, ...roomIds, reqCheckOut, reqCheckIn]
    );
    return rows;
  };

  // Clean old test bookings
  await db.query('DELETE FROM bookings WHERE booking_id LIKE ?', ['BK-20261010-%']);

  // Get test user
  const [users] = await db.query('SELECT id FROM users WHERE email = ?', ['guest@hotel.com']);
  const testUser = users[0];
  const dateSegment = '20261010';
  const testBookingId1 = `BK-${dateSegment}-9001`;

  // Insert Customer A booking for Room 1: 2026-10-10 14:00 to 2026-10-12 11:00
  const [insertB1] = await db.query(
    `
    INSERT INTO bookings (booking_id, user_id, flat_id, check_in_date, check_in_time, check_out_date, check_out_time, number_of_persons, status)
    VALUES (?, ?, 1, '2026-10-10', '14:00', '2026-10-12', '11:00', 4, 'confirmed')
  `,
    [testBookingId1, testUser.id]
  );

  await db.query('INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, 1)', [
    insertB1.insertId,
  ]);

  // Customer B attempts to book Room 1: 2026-10-11 14:00 to 2026-10-13 11:00 -> MUST OVERLAP
  const conflictRoom1 = await checkOverlap(1, [1], '2026-10-11T14:00:00', '2026-10-13T11:00:00');
  assert(conflictRoom1.length > 0, 'Customer B overlapping booking on Room 1 is correctly DETECTED & BLOCKED');

  // Customer B attempts to book Room 2 for same dates: 2026-10-11 to 2026-10-13 -> MUST BE FREE
  const conflictRoom2 = await checkOverlap(1, [2], '2026-10-11T14:00:00', '2026-10-13T11:00:00');
  assert(conflictRoom2.length === 0, 'Customer B is correctly ALLOWED to book Room 2 for the same dates');

  // Customer C attempts to book Both Rooms -> MUST OVERLAP on Room 1
  const conflictBoth = await checkOverlap(1, [1, 2], '2026-10-11T14:00:00', '2026-10-13T11:00:00');
  assert(conflictBoth.length > 0, 'Booking Both Rooms is blocked when Room 1 is already occupied');

  // Clean test bookings
  await db.query('DELETE FROM bookings WHERE booking_id LIKE ?', ['BK-20261010-%']);

  // 4. Verify ZERO pricing/revenue columns in MySQL database schema
  const [columns] = await db.query(
    `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = ?
  `,
    [DB_NAME]
  );

  const forbiddenWords = ['price', 'revenue', 'amount', 'rent', 'payment', 'cost', 'currency', 'rate'];
  const violations = columns.filter((col) =>
    forbiddenWords.some((fw) => col.COLUMN_NAME.toLowerCase().includes(fw))
  );

  assert(
    violations.length === 0,
    `MySQL schema has ZERO pricing/financial columns (Violations: ${JSON.stringify(violations)})`
  );

  await db.end();

  console.log('----------------------------------------------------');
  console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('----------------------------------------------------');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
