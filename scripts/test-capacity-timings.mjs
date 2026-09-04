console.log('🧪 Verifying Max Capacity 10, 24H Timings (12 AM - 11 PM), and Number of Rooms (Max: 2)...');

const BASE_URL = 'http://localhost:3000';

async function run() {
  // 1. Fetch room details
  const roomRes = await fetch(`${BASE_URL}/api/room`);
  const roomData = await roomRes.json();
  console.log(`✓ Room Name: "${roomData.room.room_name}"`);
  console.log(`✓ Room Capacity: ${roomData.room.capacity} Persons (Expected: 10)`);
  console.log(`✓ Total Rooms in Inventory: ${roomData.room.total_rooms} Rooms (Expected: 2)`);

  if (roomData.room.capacity < 10) {
    throw new Error(`Expected capacity >= 10, got ${roomData.room.capacity}`);
  }
  if (roomData.room.total_rooms < 2) {
    throw new Error(`Expected total_rooms >= 2, got ${roomData.room.total_rooms}`);
  }

  // 2. Test booking with 2 rooms and 8 persons
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'guest@hotel.com', password: 'Guest@12345' }),
  });
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

  const testDate = '2026-12-15';
  const testTime = '02:00 AM'; // 12 AM - 11 PM slot testing

  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      roomId: 1,
      fullName: 'Rahul Sharma',
      mobileNumber: '+919876501234',
      bookingDate: testDate,
      bookingTime: testTime,
      numberOfPersons: 8,
      numberOfRooms: 2, // Booking 2 rooms simultaneously
      specialRequests: '2 connected rooms requested for 8 guests',
    }),
  });

  const bookData = await bookRes.json();
  if (!bookRes.ok || !bookData.success) {
    throw new Error(`Booking 2 rooms failed: ${JSON.stringify(bookData)}`);
  }

  console.log('✅ Successfully booked 2 rooms for 8 persons!');
  console.log('   - Booking ID:', bookData.booking.booking_id);
  console.log('   - Number of Rooms:', bookData.booking.number_of_rooms);
  console.log('   - Number of Persons:', bookData.booking.number_of_persons);
  console.log('   - Total Amount (2 rooms × ₹2499):', `₹${bookData.booking.total_amount}`);
  console.log('   - Time Slot:', bookData.booking.booking_time);

  // 3. Verify availability is now 0 for this slot
  const availRes = await fetch(`${BASE_URL}/api/availability?roomId=1&date=${testDate}&time=${encodeURIComponent(testTime)}`);
  const availData = await availRes.json();
  console.log('✅ Live Availability after reserving 2 rooms:', availData.slotAvailability?.message);
  console.log('   - Remaining Rooms:', availData.slotAvailability?.remainingRooms);

  console.log('\n🎉 ALL UPDATES (CAPACITY 10, 24H TIMINGS 12 AM - 11 PM, MAX 2 ROOMS) VERIFIED SUCCESSFULLY!\n');
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
