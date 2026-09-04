console.log('🧪 Starting End-to-End Test for Admin Cancellation & User History Notice...');

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  // 1. Register and login a test guest
  const guestEmail = `guest_cancel_${Date.now()}@example.com`;
  const guestPassword = 'Password@123';

  console.log(`\n1. Registering test guest: ${guestEmail}...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rahul Sharma',
      email: guestEmail,
      password: guestPassword,
      confirmPassword: guestPassword,
      mobileNumber: '+91 9876543210',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Guest registration failed: ${JSON.stringify(regData)}`);
  }

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guestEmail, password: guestPassword }),
  });
  const guestCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // 2. Guest books Room 1
  console.log('2. Guest booking Room 1...');
  const randomDay = Math.floor(10 + Math.random() * 15);
  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      flatId: 1,
      roomOption: 'room1',
      fullName: 'Rahul Sharma',
      email: guestEmail,
      mobileNumber: '+91 9876543210',
      checkInDate: `2026-12-${randomDay}`,
      checkInTime: '14:00',
      checkOutDate: `2026-12-${randomDay + 2}`,
      checkOutTime: '11:00',
      numberOfPersons: 2,
    }),
  });

  const bookData = await bookRes.json();
  if (!bookRes.ok || !bookData.success) {
    throw new Error(`Booking failed: ${JSON.stringify(bookData)}`);
  }
  const booking = bookData.booking;
  console.log(`✅ Room 1 booked! ID: ${booking.booking_id} (DB ID: ${booking.id})`);

  // 3. Login as Admin
  console.log('\n3. Logging in as Admin...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@hotel.com',
      password: 'Admin@12345',
    }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // 4. Admin cancels the guest's booking
  console.log(`4. Admin cancelling booking ${booking.booking_id}...`);
  const adminCancelRes = await fetch(`${BASE_URL}/api/admin/bookings/${booking.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      status: 'cancelled',
      cancellationReason: 'Admin canceled your room booking',
    }),
  });

  const adminCancelData = await adminCancelRes.json();
  if (!adminCancelRes.ok || !adminCancelData.success) {
    throw new Error(`Admin cancellation failed: ${JSON.stringify(adminCancelData)}`);
  }
  console.log('✅ Admin cancellation request succeeded.');

  // 5. Guest retrieves their booking history
  console.log('\n5. Guest checking their Booking History (/api/bookings)...');
  const userBookingsRes = await fetch(`${BASE_URL}/api/bookings`, {
    headers: { Cookie: guestCookie },
  });
  const userBookingsData = await userBookingsRes.json();
  if (!userBookingsRes.ok || !userBookingsData.success) {
    throw new Error(`Failed to fetch guest bookings: ${JSON.stringify(userBookingsData)}`);
  }

  const cancelledBooking = userBookingsData.bookings.find(
    (b) => b.booking_id === booking.booking_id
  );

  if (!cancelledBooking) {
    throw new Error('Booking not found in guest history!');
  }

  console.log('\n📊 Guest Booking Record Received:');
  console.log('   - Booking ID:', cancelledBooking.booking_id);
  console.log('   - Status:', cancelledBooking.status);
  console.log('   - Cancelled By:', cancelledBooking.cancelled_by);
  console.log('   - Cancellation Reason:', cancelledBooking.cancellation_reason);
  console.log('   - Cancelled At:', cancelledBooking.cancelled_at);

  if (cancelledBooking.status !== 'cancelled') {
    throw new Error(`Expected status 'cancelled', got '${cancelledBooking.status}'`);
  }
  if (cancelledBooking.cancelled_by !== 'admin') {
    throw new Error(`Expected cancelled_by 'admin', got '${cancelledBooking.cancelled_by}'`);
  }
  if (cancelledBooking.cancellation_reason !== 'Admin canceled your room booking') {
    throw new Error(
      `Expected cancellation_reason 'Admin canceled your room booking', got '${cancelledBooking.cancellation_reason}'`
    );
  }
  if (!cancelledBooking.cancelled_at) {
    throw new Error('Expected cancelled_at timestamp to be populated');
  }

  console.log('\n====================================================');
  console.log('🎉 E2E ADMIN CANCELLATION & USER HISTORY TEST PASSED 100%!');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ E2E test failed:', err);
  process.exit(1);
});
