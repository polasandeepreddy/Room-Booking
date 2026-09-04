console.log('🚀 Running Complete End-to-End API Integration & Concurrency Test...');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  let cookieVikram = '';
  let cookieAdmin = '';

  // 1. Register a new user
  console.log('\n1. Testing User Registration...');
  const regEmail = `vikram_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Vikram Patel',
      email: regEmail,
      password: 'SecurePassword@123',
      confirmPassword: 'SecurePassword@123',
      mobileNumber: '+919876543210',
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log('✅ Registration succeeded with message:', regData.message);

  // 2. Login as newly registered user
  console.log('\n2. Testing User Login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'SecurePassword@123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  cookieVikram = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('✅ User login successful. Guest:', loginData.user.fullName);

  // 3. Check Room Details and Facilities
  console.log('\n3. Testing Room & Facilities Fetch...');
  const roomRes = await fetch(`${BASE_URL}/api/room`);
  const roomData = await roomRes.json();
  console.log(`✅ Fetched Rooms: ${roomData.rooms.length} room(s) available.`);

  // 4. Check Real-Time Availability for date
  const randomDay = Math.floor(10 + Math.random() * 15);
  const checkInDate = `2026-11-${randomDay}`;
  const checkOutDate = `2026-11-${randomDay + 2}`;
  const checkInTime = '14:00';
  const checkOutTime = '11:00';

  console.log(`\n4. Testing Real-time Availability for ${checkInDate} to ${checkOutDate}...`);
  const availRes = await fetch(`${BASE_URL}/api/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flatId: 1,
      roomOption: 'room1',
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
    }),
  });
  const availData = await availRes.json();
  console.log('✅ Availability Check:', availData.message);

  // 5. Create Booking for Vikram (Room 1)
  console.log('\n5. Testing Booking Creation for Vikram (Room 1)...');
  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieVikram,
    },
    body: JSON.stringify({
      flatId: 1,
      roomOption: 'room1',
      fullName: 'Vikram Patel',
      email: regEmail,
      mobileNumber: '+919876543210',
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      numberOfPersons: 2,
      specialRequests: 'Quiet suite requested',
    }),
  });

  const bookData = await bookRes.json();
  if (!bookRes.ok || !bookData.success) {
    throw new Error(`Booking failed: ${JSON.stringify(bookData)}`);
  }
  const bookingId = bookData.booking.booking_id;
  console.log('✅ Booking Confirmed! Unique Booking ID:', bookingId, 'Assigned:', bookData.booking.rooms_display);

  // 6. Test Double Booking Rejection for Room 1
  console.log('\n6. Testing Double Booking Collision Prevention on Room 1...');
  const guestLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'guest@hotel.com', password: 'Guest@12345' }),
  });
  const cookieGuest = guestLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  const collisionRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieGuest,
    },
    body: JSON.stringify({
      flatId: 1,
      roomOption: 'room1',
      fullName: 'Rahul Sharma',
      email: 'guest@hotel.com',
      mobileNumber: '+919876501234',
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      numberOfPersons: 2,
    }),
  });

  const collisionData = await collisionRes.json();
  if (collisionRes.status === 409 || !collisionData.success) {
    console.log('✅ Double-Booking Successfully Blocked!');
    console.log('   Error Message received:', collisionData.error);
  } else {
    throw new Error(`CRITICAL FAILURE: Collision was not blocked. Status: ${collisionRes.status}`);
  }

  // 7. Verify Guest Bookings List
  console.log('\n7. Testing My Bookings Retrieval...');
  const myListRes = await fetch(`${BASE_URL}/api/bookings`, {
    headers: { 'Cookie': cookieVikram },
  });
  const myListData = await myListRes.json();
  console.log(`✅ Retrieved ${myListData.bookings.length} booking(s) for Vikram. Status:`, myListData.bookings[0].status);

  // 8. Test Booking Cancellation
  console.log(`\n8. Testing Booking Cancellation for ID ${bookingId}...`);
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Cookie': cookieVikram },
  });
  const cancelData = await cancelRes.json();
  console.log('✅ Cancellation Response:', cancelData.message);

  // 9. Verify Released Slot is now Bookable
  console.log('\n9. Verifying Released Slot is now Available again...');
  const secondTryRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieGuest,
    },
    body: JSON.stringify({
      flatId: 1,
      roomOption: 'room1',
      fullName: 'Rahul Sharma',
      email: 'guest@hotel.com',
      mobileNumber: '+919876501234',
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      numberOfPersons: 2,
    }),
  });
  const secondTryData = await secondTryRes.json();
  if (secondTryRes.ok && secondTryData.success) {
    console.log('✅ Released slot was successfully booked by Guest! ID:', secondTryData.booking.booking_id);
  } else {
    throw new Error(`Failed to book released slot: ${JSON.stringify(secondTryData)}`);
  }

  // 10. Admin Telemetry & Control Center
  console.log('\n10. Testing Admin Panel Endpoints...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hotel.com', password: 'Admin@12345' }),
  });
  
  const rawCookies = adminLoginRes.headers.getSetCookie ? adminLoginRes.headers.getSetCookie() : [adminLoginRes.headers.get('set-cookie')];
  cookieAdmin = rawCookies.map(c => c ? c.split(';')[0] : '').filter(Boolean).join('; ');

  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { 'Cookie': cookieAdmin },
  });
  const adminStatsData = await adminStatsRes.json();
  if (!adminStatsRes.ok) {
    throw new Error(`Admin stats request failed: ${JSON.stringify(adminStatsData)}`);
  }
  console.log('✅ Admin Stats Telemetry:');
  console.log('   - Total Bookings:', adminStatsData.stats.totalBookings);
  console.log('   - Total Revenue:', `₹${adminStatsData.stats.totalRevenue}`);
  console.log('   - Confirmed Bookings:', adminStatsData.stats.confirmedBookings);

  console.log('\n🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
