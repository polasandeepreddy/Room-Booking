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
const db = new Database(resolvedDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function normalizeSql(sql) {
  return sql
    .replace(/\bFOR\s+UPDATE\b/gi, '')
    .replace(/\bNOW\(\)/gi, "datetime('now', 'localtime')")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now', 'localtime')")
    .trim();
}

async function query(sql, params = []) {
  const cleanSql = normalizeSql(sql);
  const stmt = db.prepare(cleanSql);
  if (stmt.reader) {
    return stmt.all(params);
  }
  const info = stmt.run(params);
  return [{ changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid), insertId: Number(info.lastInsertRowid) }];
}

async function withTransaction(callback) {
  db.exec('BEGIN IMMEDIATE');
  const conn = {
    async query(sql, params = []) {
      const cleanSql = normalizeSql(sql);
      const stmt = db.prepare(cleanSql);
      if (stmt.reader) {
        const rows = stmt.all(params);
        return [rows];
      }
      const info = stmt.run(params);
      return [[{ changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid), insertId: Number(info.lastInsertRowid) }]];
    },
    async execute(sql, params = []) {
      const cleanSql = normalizeSql(sql);
      const info = db.prepare(cleanSql).run(params);
      return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
    },
  };
  try {
    const result = await callback(conn);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {}
    throw err;
  }
}

function normalizeTime24H(timeStr) {
  if (!timeStr) return '00:00';
  let t = timeStr.trim();
  const match12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3]?.toUpperCase() || match12[4]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10).toString().padStart(2, '0');
    const minutes = match24[2];
    return `${hours}:${minutes}`;
  }
  return '00:00';
}

function normalizeDateYYYYMMDD(dateStr) {
  if (!dateStr) return '';
  const d = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const matchDMY = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, '0');
    const month = matchDMY[2].padStart(2, '0');
    const year = matchDMY[3];
    return `${year}-${month}-${day}`;
  }
  return d;
}

function toMySQLDateTime(dateStr, timeStr) {
  return `${normalizeDateYYYYMMDD(dateStr)} ${normalizeTime24H(timeStr)}:00`;
}

async function checkAvailability(params) {
  const flatId = params.flatId || 1;
  const normInDate = normalizeDateYYYYMMDD(params.checkInDate);
  const normInTime = normalizeTime24H(params.checkInTime);
  const normOutDate = normalizeDateYYYYMMDD(params.checkOutDate);
  const normOutTime = normalizeTime24H(params.checkOutTime);

  const reqCheckInAt = toMySQLDateTime(normInDate, normInTime);
  const reqCheckOutAt = toMySQLDateTime(normOutDate, normOutTime);

  if (new Date(reqCheckOutAt) <= new Date(reqCheckInAt)) {
    return {
      isAvailable: false,
      room1Available: false,
      room2Available: false,
      bothAvailable: false,
      message: 'Check-out date/time must be after check-in date/time.',
    };
  }

  const allRooms = await query('SELECT * FROM rooms WHERE flat_id = ? ORDER BY id ASC', [flatId]);
  const room1 = allRooms[0] || { id: 1, room_name: 'Room 1', status: 'available' };
  const room2 = allRooms[1] || { id: 2, room_name: 'Room 2', status: 'available' };

  const overlappingRows = await query(
    `
    SELECT br.room_id, r.room_name, b.check_in_at, b.check_out_at, b.booking_id
    FROM bookings b
    JOIN booking_rooms br ON br.booking_id = b.id
    JOIN rooms r ON br.room_id = r.id
    WHERE b.flat_id = ?
      AND b.status IN ('confirmed', 'pending', 'completed')
      AND b.check_in_at < ?
      AND b.check_out_at > ?
  `,
    [flatId, reqCheckOutAt, reqCheckInAt]
  );

  const conflictingRoomIds = new Set(overlappingRows.map((r) => r.room_id));

  const room1Available = room1.status === 'available' && !conflictingRoomIds.has(room1.id);
  const room2Available = room2.status === 'available' && !conflictingRoomIds.has(room2.id);
  const bothAvailable = room1Available && room2Available;

  const availableRoomIds = [];
  if (room1Available) availableRoomIds.push(room1.id);
  if (room2Available) availableRoomIds.push(room2.id);

  let requestedRoomsAvailable = false;
  const requestedOption = params.roomOption || 'auto';
  if (requestedOption === 'auto') {
    requestedRoomsAvailable = availableRoomIds.length > 0;
  } else if (requestedOption === 'room1') {
    requestedRoomsAvailable = room1Available;
  } else if (requestedOption === 'room2') {
    requestedRoomsAvailable = room2Available;
  } else if (requestedOption === 'both') {
    requestedRoomsAvailable = bothAvailable;
  }

  return {
    isAvailable: requestedRoomsAvailable,
    room1Available,
    room2Available,
    bothAvailable,
    availableRoomIds,
    overlappingRows,
  };
}

async function createBooking(params) {
  const flatId = params.flatId || 1;
  const normInDate = normalizeDateYYYYMMDD(params.checkInDate);
  const normInTime = normalizeTime24H(params.checkInTime);
  const normOutDate = normalizeDateYYYYMMDD(params.checkOutDate);
  const normOutTime = normalizeTime24H(params.checkOutTime);

  const reqCheckInAt = toMySQLDateTime(normInDate, normInTime);
  const reqCheckOutAt = toMySQLDateTime(normOutDate, normOutTime);

  return await withTransaction(async (conn) => {
    const [allRoomRows] = await conn.query('SELECT * FROM rooms WHERE flat_id = ? ORDER BY id ASC', [flatId]);
    const room1 = allRoomRows[0];
    const room2 = allRoomRows[1];

    const [conflictRows] = await conn.query(
      `
      SELECT b.id, b.booking_id, br.room_id, r.room_name
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      JOIN rooms r ON br.room_id = r.id
      WHERE b.flat_id = ?
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND b.check_in_at < ?
        AND b.check_out_at > ?
    `,
      [flatId, reqCheckOutAt, reqCheckInAt]
    );

    const occupiedRoomIds = new Set(conflictRows.map((c) => c.room_id));
    const room1Free = room1 && room1.status === 'available' && !occupiedRoomIds.has(room1.id);
    const room2Free = room2 && room2.status === 'available' && !occupiedRoomIds.has(room2.id);

    let finalRoomIds = [];
    const requestedOption = params.roomOption || 'auto';

    if (requestedOption === 'both') {
      if (!room1Free || !room2Free) {
        throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
      }
      finalRoomIds = [room1.id, room2.id];
    } else if (requestedOption === 'room1') {
      if (!room1Free) {
        throw new Error('Room 1 is unavailable for the selected date and time.');
      }
      finalRoomIds = [room1.id];
    } else if (requestedOption === 'room2') {
      if (!room2Free) {
        throw new Error('Room 2 is unavailable for the selected date and time.');
      }
      finalRoomIds = [room2.id];
    } else {
      if (room1Free) finalRoomIds = [room1.id];
      else if (room2Free) finalRoomIds = [room2.id];
      else {
        throw new Error('Both rooms are unavailable for the selected date and time.');
      }
    }

    const cleanDate = normInDate.replace(/[^0-9]/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `BK-${cleanDate}-${randSuffix}`;

    const [insertResult] = await conn.execute(
      `
      INSERT INTO bookings (
        booking_id, user_id, flat_id, check_in_date, check_in_time,
        check_out_date, check_out_time, check_in_at, check_out_at,
        number_of_persons, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `,
      [
        bookingId,
        params.userId || 1,
        flatId,
        normInDate,
        normInTime,
        normOutDate,
        normOutTime,
        reqCheckInAt,
        reqCheckOutAt,
        params.numberOfPersons || 2,
      ]
    );

    for (const rId of finalRoomIds) {
      await conn.execute('INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, ?)', [
        insertResult.insertId,
        rId,
      ]);
    }

    return { bookingId, roomIds: finalRoomIds, dbId: insertResult.insertId };
  });
}

async function runScenarioTests() {
  console.log('========================================================================');
  console.log('  EXACT DATETIME-RANGE AVAILABILITY & TIME-BLOCK LOGIC VERIFICATION');
  console.log('========================================================================\n');

  // Clean test bookings on 2026-09-05 and 2026-09-06
  await query("DELETE FROM bookings WHERE check_in_date IN ('2026-09-05', '2026-09-06') OR check_out_date IN ('2026-09-05', '2026-09-06')");

  let userRow = await query('SELECT id FROM users LIMIT 1');
  const userId = userRow && userRow.length > 0 ? userRow[0].id : 1;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: User 1 books Room 1 on 05/09/2026 at 03:00 AM to 04:00 PM
    // -------------------------------------------------------------
    console.log('--- SCENARIO 1: User 1 books 05/09/2026 (03:00 AM → 04:00 PM) ---');
    const user1Booking = await createBooking({
      userId,
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '03:00 AM',
      checkOutDate: '05/09/2026',
      checkOutTime: '04:00 PM',
      numberOfPersons: 2,
    });
    assert(user1Booking.bookingId.length > 0, 'User 1 booking confirmed for Room 1 (03:00 AM to 04:00 PM)');

    // -------------------------------------------------------------
    // SCENARIO 2: Check remaining available hours on 05/09/2026
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Verify only exact time range is blocked on 05/09/2026 ---');
    
    // (a) Earlier time on same date: 12:00 AM to 03:00 AM -> MUST BE AVAILABLE!
    const earlyCheck = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '00:00', // 12:00 AM
      checkOutDate: '05/09/2026',
      checkOutTime: '03:00', // 03:00 AM
    });
    assert(earlyCheck.room1Available === true, 'Room 1 is AVAILABLE on 05/09/2026 from 12:00 AM to 03:00 AM (before booking)');

    // (b) Exact booked time: 03:00 AM to 04:00 PM -> MUST BE BLOCKED!
    const exactCheck = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '03:00 AM',
      checkOutDate: '05/09/2026',
      checkOutTime: '04:00 PM',
    });
    assert(exactCheck.room1Available === false, 'Room 1 is BLOCKED on 05/09/2026 from 03:00 AM to 04:00 PM (exact overlap)');

    // (c) Partial overlap: 02:00 PM to 05:00 PM -> MUST BE BLOCKED!
    const overlapCheck = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '02:00 PM',
      checkOutDate: '05/09/2026',
      checkOutTime: '05:00 PM',
    });
    assert(overlapCheck.room1Available === false, 'Room 1 is BLOCKED on 05/09/2026 from 02:00 PM to 05:00 PM (partial overlap)');

    // -------------------------------------------------------------
    // SCENARIO 3: Room Independence
    // During User 1's booked time (03:00 AM to 04:00 PM), Room 2 MUST BE AVAILABLE!
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Verify Room 2 is completely available during Room 1 booking ---');
    const room2Check = await checkAvailability({
      roomOption: 'room2',
      checkInDate: '05/09/2026',
      checkInTime: '03:00 AM',
      checkOutDate: '05/09/2026',
      checkOutTime: '04:00 PM',
    });
    assert(room2Check.room2Available === true, 'Room 2 is 100% AVAILABLE during 03:00 AM → 04:00 PM on 05/09/2026');

    // -------------------------------------------------------------
    // SCENARIO 4: User 2 wants 05/09/2026 at 04:30 PM to 06/09/2026 at 01:00 AM (Crossing Midnight)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: User 2 books 05/09/2026 (04:30 PM) → 06/09/2026 (01:00 AM) ---');
    
    // Check availability first
    const user2Avail = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '04:30 PM',
      checkOutDate: '06/09/2026',
      checkOutTime: '01:00 AM',
    });
    assert(user2Avail.room1Available === true, 'Room 1 is AVAILABLE for User 2 (05/09 04:30 PM to 06/09 01:00 AM, non-overlapping)');

    // User 2 creates booking
    const user2Booking = await createBooking({
      userId,
      roomOption: 'room1',
      checkInDate: '05/09/2026',
      checkInTime: '04:30 PM',
      checkOutDate: '06/09/2026',
      checkOutTime: '01:00 AM',
      numberOfPersons: 2,
    });
    assert(user2Booking.bookingId.length > 0, 'User 2 booking confirmed successfully across midnight (04:30 PM → 01:00 AM)');

    // -------------------------------------------------------------
    // SCENARIO 5: Next Guest on 06/09/2026 from 01:00 AM to 10:00 AM
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Check availability on 06/09/2026 after User 2 checkout ---');
    const morningCheck = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '06/09/2026',
      checkInTime: '01:00 AM',
      checkOutDate: '06/09/2026',
      checkOutTime: '10:00 AM',
    });
    assert(morningCheck.room1Available === true, 'Room 1 is AVAILABLE on 06/09/2026 from 01:00 AM to 10:00 AM (after User 2)');

    // Adjacent overlap test: 06/09/2026 00:30 AM to 03:00 AM should conflict with User 2 (checkout at 01:00 AM)
    const midnightConflict = await checkAvailability({
      roomOption: 'room1',
      checkInDate: '06/09/2026',
      checkInTime: '00:30', // 12:30 AM
      checkOutDate: '06/09/2026',
      checkOutTime: '03:00', // 03:00 AM
    });
    assert(midnightConflict.room1Available === false, 'Conflict correctly detected on 06/09/2026 from 12:30 AM to 03:00 AM overlapping User 2');

    // -------------------------------------------------------------
    // SCENARIO 6: Both Rooms booking requirement
    // When Room 1 has User 1 and User 2 bookings, Room 2 is completely free!
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Independent booking on Room 2 during User 1 & 2 stays ---');
    const room2StayBooking = await createBooking({
      userId,
      roomOption: 'room2',
      checkInDate: '05/09/2026',
      checkInTime: '10:00 AM',
      checkOutDate: '05/09/2026',
      checkOutTime: '08:00 PM',
      numberOfPersons: 3,
    });
    assert(room2StayBooking.roomIds.length === 1 && room2StayBooking.roomIds[0] === 2, 'Room 2 successfully booked during Room 1 occupancy');

    // Summary
    console.log('\n========================================================================');
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runScenarioTests();
