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
  if (!timeStr) return '00:00:00';
  let t = timeStr.trim();
  const match12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3]?.toUpperCase() || match12[4]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10).toString().padStart(2, '0');
    const minutes = match24[2];
    const seconds = match24[3] || '00';
    return `${hours}:${minutes}:${seconds}`;
  }
  return '00:00:00';
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
  return `${normalizeDateYYYYMMDD(dateStr)} ${normalizeTime24H(timeStr)}`;
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
    SELECT br.room_id, r.room_name
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

  let autoAssignedRoomIds = [];
  let autoAssignedRoomDisplay = '';
  if (room1Available) {
    autoAssignedRoomIds = [room1.id];
    autoAssignedRoomDisplay = room1.room_name;
  } else if (room2Available) {
    autoAssignedRoomIds = [room2.id];
    autoAssignedRoomDisplay = room2.room_name;
  }

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

  let message = '';
  if (room1Available && room2Available) {
    message = 'Both rooms are available.';
  } else if (room1Available && !room2Available) {
    message = 'Room 1 is Available, Room 2 is Not Available.';
  } else if (!room1Available && room2Available) {
    message = 'Room 1 is Not Available, Room 2 is Available.';
  } else {
    message = 'Both rooms are unavailable for the selected date and time. Please select a different date or time.';
  }

  return {
    isAvailable: requestedRoomsAvailable,
    room1Available,
    room2Available,
    bothAvailable,
    availableRoomIds,
    autoAssignedRoomIds,
    autoAssignedRoomDisplay,
    message,
  };
}

let defaultUserId = 1;

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
        throw new Error('Room 1 is unavailable for the selected date and time. Please select Room 2 or a different time.');
      }
      finalRoomIds = [room1.id];
    } else if (requestedOption === 'room2') {
      if (!room2Free) {
        throw new Error('Room 2 is unavailable for the selected date and time. Please select Room 1 or a different time.');
      }
      finalRoomIds = [room2.id];
    } else {
      if (room1Free) finalRoomIds = [room1.id];
      else if (room2Free) finalRoomIds = [room2.id];
      else {
        throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
      }
    }

    if (params.numberOfPersons > 10) {
      throw new Error('Maximum capacity is 10 persons.');
    }
    if (finalRoomIds.length === 1 && params.numberOfPersons > 5) {
      throw new Error('Single room capacity is maximum 5 persons. For more persons, please select Both Rooms.');
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
        params.userId || defaultUserId,
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

async function runTests() {
  console.log('====================================================');
  console.log('  ROOM BOOKING AVAILABILITY & CONFLICT LOGIC TESTS');
  console.log('====================================================\n');

  // Clean test bookings
  await query("DELETE FROM bookings WHERE booking_id LIKE 'BK-TEST-%' OR booking_id LIKE 'BK-202609%'");

  // Ensure test user exists
  let userRow = await query('SELECT id FROM users LIMIT 1');
  if (userRow && userRow.length > 0) {
    defaultUserId = userRow[0].id;
  }

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
    // Test 1: Initial Availability on fresh date
    console.log('TEST 1: Check availability when neither room is booked...');
    const avail1 = await checkAvailability({
      checkInDate: '2026-09-10',
      checkInTime: '02:00 PM',
      checkOutDate: '2026-09-12',
      checkOutTime: '11:00 AM',
    });
    assert(avail1.bothAvailable === true, 'Both rooms are available.');
    assert(avail1.room1Available === true, 'Room 1 is available.');
    assert(avail1.room2Available === true, 'Room 2 is available.');

    // Test 2: Book Room 1
    console.log('\nTEST 2: Book Room 1 for 10th - 12th Sept...');
    const booking1 = await createBooking({
      roomOption: 'room1',
      checkInDate: '2026-09-10',
      checkInTime: '02:00 PM',
      checkOutDate: '2026-09-12',
      checkOutTime: '11:00 AM',
      numberOfPersons: 2,
    });
    assert(booking1.bookingId.startsWith('BK-20260910'), 'Booking ID generated correctly.');
    assert(booking1.roomIds.length === 1 && booking1.roomIds[0] === 1, 'Assigned Room 1 correctly.');

    // Test 3: Check availability during booked interval
    console.log('\nTEST 3: Verify Room 1 unavailable, Room 2 available...');
    const avail2 = await checkAvailability({
      checkInDate: '2026-09-11',
      checkInTime: '10:00 AM',
      checkOutDate: '2026-09-11',
      checkOutTime: '08:00 PM',
    });
    assert(avail2.room1Available === false, 'Room 1 is blocked due to conflict.');
    assert(avail2.room2Available === true, 'Room 2 is available.');
    assert(avail2.bothAvailable === false, 'Both rooms selection is not available.');
    assert(avail2.autoAssignedRoomDisplay === 'Room 2', 'Auto-assigned room selects Room 2.');

    // Test 4: Book Room 2 during overlapping time
    console.log('\nTEST 4: Book Room 2 during overlapping date...');
    const booking2 = await createBooking({
      roomOption: 'room2',
      checkInDate: '2026-09-11',
      checkInTime: '12:00 PM',
      checkOutDate: '2026-09-11',
      checkOutTime: '06:00 PM',
      numberOfPersons: 3,
    });
    assert(booking2.roomIds.length === 1 && booking2.roomIds[0] === 2, 'Assigned Room 2 successfully.');

    // Test 5: Check full flat availability when both are booked
    console.log('\nTEST 5: Check availability when both Room 1 and Room 2 are booked...');
    const avail3 = await checkAvailability({
      checkInDate: '2026-09-11',
      checkInTime: '01:00 PM',
      checkOutDate: '2026-09-11',
      checkOutTime: '03:00 PM',
    });
    assert(avail3.room1Available === false, 'Room 1 is unavailable.');
    assert(avail3.room2Available === false, 'Room 2 is unavailable.');
    assert(avail3.isAvailable === false, 'Overall flat booking is unavailable.');

    // Test 6: Attempt duplicate booking on full flat
    console.log('\nTEST 6: Attempting to book when both rooms are occupied...');
    try {
      await createBooking({
        roomOption: 'auto',
        checkInDate: '2026-09-11',
        checkInTime: '01:00 PM',
        checkOutDate: '2026-09-11',
        checkOutTime: '03:00 PM',
        numberOfPersons: 2,
      });
      assert(false, 'Should have thrown duplicate/conflict exception.');
    } catch (err) {
      assert(err.message.includes('unavailable'), 'Correctly blocked overlapping booking with error.');
    }

    // Test 7: Adjacent booking (Check-in right at check-out time 11:00 AM on 12th Sept)
    console.log('\nTEST 7: Non-overlapping adjacent interval (Check-in exactly when previous check-out occurs)...');
    const availAdjacent = await checkAvailability({
      checkInDate: '2026-09-12',
      checkInTime: '11:00 AM',
      checkOutDate: '2026-09-13',
      checkOutTime: '11:00 AM',
    });
    assert(availAdjacent.room1Available === true, 'Room 1 available immediately at check-out time (11:00 AM).');
    assert(availAdjacent.bothAvailable === true, 'Both rooms available for next guest.');

    // Test 8: Max Capacity validation
    console.log('\nTEST 8: Capacity validation...');
    try {
      await createBooking({
        roomOption: 'room1',
        checkInDate: '2026-09-15',
        checkInTime: '02:00 PM',
        checkOutDate: '2026-09-16',
        checkOutTime: '11:00 AM',
        numberOfPersons: 6, // Exceeds single room capacity of 5
      });
      assert(false, 'Single room capacity 6 should fail.');
    } catch (err) {
      assert(err.message.includes('capacity'), 'Single room limit 5 enforced.');
    }

    // Test 9: Cancellation restores room availability
    console.log('\nTEST 9: Booking cancellation restores availability...');
    await query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [booking1.dbId]);
    const availAfterCancel = await checkAvailability({
      checkInDate: '2026-09-10',
      checkInTime: '02:00 PM',
      checkOutDate: '2026-09-12',
      checkOutTime: '11:00 AM',
    });
    assert(availAfterCancel.room1Available === true, 'Room 1 is available again after booking cancellation.');

    // Clean up test bookings
    await query("DELETE FROM bookings WHERE booking_id LIKE 'BK-202609%'");

    console.log('\n====================================================');
    console.log(`  ALL TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    db.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    db.close();
    process.exit(1);
  }
}

runTests();
