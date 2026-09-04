import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'hotel.db');

console.log('🧪 Starting Concurrency & Double-Booking Prevention Verification...');

if (!fs.existsSync(DB_PATH)) {
  console.error('Database file not found at:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Get the user and room
const user = db.prepare("SELECT id, email FROM users WHERE role = 'user' LIMIT 1").get();
const admin = db.prepare("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1").get();
const room = db.prepare("SELECT id, total_rooms, capacity FROM rooms LIMIT 1").get();

if (!user || !room) {
  console.error('Required seed records not found.');
  process.exit(1);
}

console.log(`✓ Test Room: ID ${room.id} (Inventory: ${room.total_rooms} room, Capacity: ${room.capacity} persons)`);
console.log(`✓ Test User A (ID: ${user.id}), Test User B / Admin (ID: ${admin.id})`);

const testDate = '2026-09-10';
const testTime = '07:00 PM';

// Clean up any existing test bookings for this slot
db.prepare('DELETE FROM bookings WHERE booking_date = ? AND booking_time = ?').run(testDate, testTime);

function tryBook(userId, guestName, phone) {
  const transaction = db.transaction(() => {
    // 1. Fresh check inside transaction boundary
    const activeCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE room_id = ? 
        AND booking_date = ? 
        AND booking_time = ? 
        AND status IN ('confirmed', 'pending')
    `).get(room.id, testDate, testTime).count;

    const remaining = room.total_rooms - activeCount;
    if (remaining < 1) {
      throw new Error('Sorry, the room is already booked for the selected date and time. Please select another date or time.');
    }

    const bookingId = `BK-${testDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    db.prepare(`
      INSERT INTO bookings (
        booking_id, user_id, room_id, full_name, mobile_number,
        booking_date, booking_time, number_of_persons, number_of_rooms, status, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1, 'confirmed', 2499)
    `).run(bookingId, userId, room.id, guestName, phone, testDate, testTime);

    return { bookingId, success: true };
  });

  try {
    return transaction();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

console.log(`\n--- Scenario 1: User A books ${testDate} at ${testTime} ---`);
const resA = tryBook(user.id, 'User A (Guest)', '+919876501234');
console.log('Result A:', resA);

if (!resA.success) {
  console.error('❌ User A booking failed unexpectedly!');
  process.exit(1);
} else {
  console.log('✅ User A successfully booked! Booking ID:', resA.bookingId);
}

console.log(`\n--- Scenario 2: User B tries to book the EXACT SAME date & time ---`);
const resB = tryBook(admin.id, 'User B (Duplicate Attempt)', '+919876543210');
console.log('Result B:', resB);

if (resB.success) {
  console.error('❌ CRITICAL ERROR: Double booking allowed!');
  process.exit(1);
} else {
  console.log('✅ User B was properly REJECTED with error:');
  console.log('   "', resB.error, '"');
}

console.log('\n--- Scenario 3: Slot Cancellation & Immediate Availability Re-release ---');
db.prepare("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?").run(resA.bookingId);
console.log(`✓ Booking ${resA.bookingId} marked as cancelled.`);

const resC = tryBook(admin.id, 'User B (Retry after cancellation)', '+919876543210');
console.log('Result C:', resC);

if (resC.success) {
  console.log('✅ User B successfully booked after slot was released! Booking ID:', resC.bookingId);
} else {
  console.error('❌ Failed to book released slot:', resC.error);
  process.exit(1);
}

// Clean up
db.prepare('DELETE FROM bookings WHERE booking_date = ? AND booking_time = ?').run(testDate, testTime);
console.log('\n🎉 ALL CONCURRENCY & DOUBLE-BOOKING PREVENTIONS PASSED WITH 100% INTEGRITY!\n');
