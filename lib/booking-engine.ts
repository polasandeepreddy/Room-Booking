import { query, queryOne, withTransaction, DbTransactionConnection } from './db';
import { AvailabilityCheckResult, Booking, Room, Flat, RoomSelectionOption } from './types';
import { toMySQLDateTime, parseDateTimeToDate, normalizeDateYYYYMMDD, normalizeTime24H } from './format';

/**
 * Checks whether rooms are available for the specified date and time interval.
 * Uses exact datetime interval overlap: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn.
 */
export async function checkAvailability(params: {
  flatId?: number;
  roomOption?: RoomSelectionOption;
  roomIds?: number[];
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
}): Promise<AvailabilityCheckResult> {
  const flatId = params.flatId || 1;

  const normInDate = normalizeDateYYYYMMDD(params.checkInDate);
  const normInTime = normalizeTime24H(params.checkInTime);
  const normOutDate = normalizeDateYYYYMMDD(params.checkOutDate);
  const normOutTime = normalizeTime24H(params.checkOutTime);

  const checkInDateObj = parseDateTimeToDate(normInDate, normInTime);
  const checkOutDateObj = parseDateTimeToDate(normOutDate, normOutTime);

  if (isNaN(checkInDateObj.getTime()) || isNaN(checkOutDateObj.getTime())) {
    return {
      isAvailable: false,
      flatAvailable: false,
      room1Available: false,
      room2Available: false,
      bothAvailable: false,
      requestedRoomsAvailable: false,
      availableRoomIds: [],
      autoAssignedRoomIds: [],
      autoAssignedRoomDisplay: '',
      message: 'Invalid check-in or check-out date/time format.',
    };
  }

  if (checkOutDateObj.getTime() <= checkInDateObj.getTime()) {
    return {
      isAvailable: false,
      flatAvailable: false,
      room1Available: false,
      room2Available: false,
      bothAvailable: false,
      requestedRoomsAvailable: false,
      availableRoomIds: [],
      autoAssignedRoomIds: [],
      autoAssignedRoomDisplay: '',
      message: 'Check-out date and time must be after check-in date and time.',
    };
  }

  const reqCheckInAt = toMySQLDateTime(normInDate, normInTime);
  const reqCheckOutAt = toMySQLDateTime(normOutDate, normOutTime);

  // Get all rooms for this flat
  const allRooms = await query<Room>(
    'SELECT * FROM rooms WHERE flat_id = ? ORDER BY id ASC',
    [flatId]
  );

  if (allRooms.length === 0) {
    return {
      isAvailable: false,
      flatAvailable: false,
      room1Available: false,
      room2Available: false,
      bothAvailable: false,
      requestedRoomsAvailable: false,
      availableRoomIds: [],
      autoAssignedRoomIds: [],
      autoAssignedRoomDisplay: '',
      message: 'No rooms configured for this flat.',
    };
  }

  const room1 = allRooms[0] || { id: 1, room_name: 'Room 1', status: 'available' };
  const room2 = allRooms[1] || { id: 2, room_name: 'Room 2', status: 'available' };

  // Find all active bookings overlapping with the requested interval
  // Statuses considered occupying: 'confirmed', 'pending', 'completed'
  // Statuses ignored: 'cancelled', 'rejected', 'expired'
  // Overlap condition: existing_check_in < requested_check_out AND existing_check_out > requested_check_in
  const overlappingRows = await query<{
    id: number;
    booking_id: string;
    check_in_date: string;
    check_in_time: string;
    check_out_date: string;
    check_out_time: string;
    check_in_at: string;
    check_out_at: string;
    room_id: number;
    room_name: string;
  }>(
    `
      SELECT 
        b.id,
        b.booking_id,
        b.check_in_date,
        b.check_in_time,
        b.check_out_date,
        b.check_out_time,
        b.check_in_at,
        b.check_out_at,
        br.room_id,
        r.room_name
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

  // Fetch all active bookings touching the requested date span for UI visualizer
  const existingOnDates = await query<{
    id: number;
    booking_id: string;
    check_in_date: string;
    check_in_time: string;
    check_out_date: string;
    check_out_time: string;
    check_in_at: string;
    check_out_at: string;
    status: string;
    room_id: number;
    room_name: string;
  }>(
    `
      SELECT 
        b.id,
        b.booking_id,
        b.check_in_date,
        b.check_in_time,
        b.check_out_date,
        b.check_out_time,
        b.check_in_at,
        b.check_out_at,
        b.status,
        br.room_id,
        r.room_name
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      JOIN rooms r ON br.room_id = r.id
      WHERE b.flat_id = ?
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND b.check_in_date <= ?
        AND b.check_out_date >= ?
      ORDER BY b.check_in_at ASC
    `,
    [flatId, normOutDate, normInDate]
  );

  const conflictingRoomIds = new Set(overlappingRows.map((r) => r.room_id));

  const room1Available = (room1.status === 'available') && !conflictingRoomIds.has(room1.id);
  const room2Available = (room2.status === 'available') && !conflictingRoomIds.has(room2.id);
  const bothAvailable = room1Available && room2Available;

  const availableRoomIds: number[] = [];
  if (room1Available) availableRoomIds.push(room1.id);
  if (room2Available) availableRoomIds.push(room2.id);

  // Determine auto-assigned room(s)
  let autoAssignedRoomIds: number[] = [];
  let autoAssignedRoomDisplay = '';

  if (room1Available) {
    autoAssignedRoomIds = [room1.id];
    autoAssignedRoomDisplay = room1.room_name;
  } else if (room2Available) {
    autoAssignedRoomIds = [room2.id];
    autoAssignedRoomDisplay = room2.room_name;
  }

  // Determine availability of specifically requested rooms
  let requestedRoomsAvailable = false;
  const requestedOption = params.roomOption || (params.roomIds && params.roomIds.length === 2 ? 'both' : (params.roomIds && params.roomIds[0] === 2 ? 'room2' : (params.roomIds && params.roomIds[0] === 1 ? 'room1' : 'auto')));

  if (requestedOption === 'auto') {
    requestedRoomsAvailable = availableRoomIds.length > 0;
  } else if (requestedOption === 'room1') {
    requestedRoomsAvailable = room1Available;
  } else if (requestedOption === 'room2') {
    requestedRoomsAvailable = room2Available;
  } else if (requestedOption === 'both') {
    requestedRoomsAvailable = bothAvailable;
  } else if (params.roomIds && params.roomIds.length > 0) {
    requestedRoomsAvailable = params.roomIds.every((id) => availableRoomIds.includes(id));
  } else {
    requestedRoomsAvailable = availableRoomIds.length > 0;
  }

  // Generate clear user-facing availability status message
  let message = '';
  if (room1Available && room2Available) {
    message = 'Both rooms are available for the selected time range.';
  } else if (room1Available && !room2Available) {
    const conflict2 = overlappingRows.find((r) => r.room_id === room2.id);
    const rangeInfo = conflict2 ? ` (Booked: ${conflict2.check_in_time} → ${conflict2.check_out_time})` : '';
    message = `Room 1 is Available, Room 2 is Occupied${rangeInfo}. Remaining hours stay available.`;
  } else if (!room1Available && room2Available) {
    const conflict1 = overlappingRows.find((r) => r.room_id === room1.id);
    const rangeInfo = conflict1 ? ` (Booked: ${conflict1.check_in_time} → ${conflict1.check_out_time})` : '';
    message = `Room 1 is Occupied${rangeInfo}, Room 2 is Available. Remaining hours stay available.`;
  } else {
    message = 'Both rooms are unavailable for this specific time slot. Please select non-overlapping hours or choose different dates.';
  }

  return {
    isAvailable: requestedRoomsAvailable,
    flatAvailable: availableRoomIds.length > 0,
    room1Available,
    room2Available,
    bothAvailable,
    requestedRoomsAvailable,
    availableRoomIds,
    autoAssignedRoomIds,
    autoAssignedRoomDisplay,
    conflictingBookings: overlappingRows.map((r) => ({
      booking_id: r.booking_id,
      room_id: r.room_id,
      room_name: r.room_name,
      check_in: `${r.check_in_date} ${r.check_in_time}`,
      check_out: `${r.check_out_date} ${r.check_out_time}`,
      check_in_at: r.check_in_at,
      check_out_at: r.check_out_at,
    })),
    existingBookingsOnDates: existingOnDates.map((r) => ({
      booking_id: r.booking_id,
      room_id: r.room_id,
      room_name: r.room_name,
      check_in_date: r.check_in_date,
      check_in_time: r.check_in_time,
      check_out_date: r.check_out_date,
      check_out_time: r.check_out_time,
      check_in_at: r.check_in_at,
      check_out_at: r.check_out_at,
      status: r.status,
    })),
    message,
  };
}

/**
 * Generates a unique, standardized human-readable Booking ID: BK-YYYYMMDD-XXXX
 */
async function generateBookingId(conn: DbTransactionConnection, checkInDate: string): Promise<string> {
  const cleanDate = normalizeDateYYYYMMDD(checkInDate);
  const dateSegment = cleanDate.replace(/[^0-9]/g, '');
  const prefix = `BK-${dateSegment}-`;

  const [countRows] = await conn.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM bookings WHERE booking_id LIKE ?',
    [`${prefix}%`]
  );

  const existingCount = Number(countRows[0]?.cnt || 0);
  const nextSeq = (existingCount + 1).toString().padStart(4, '0');
  const candidateId = `${prefix}${nextSeq}`;

  const [existRows] = await conn.query<{ id: number }>(
    'SELECT id FROM bookings WHERE booking_id = ?',
    [candidateId]
  );

  if (existRows.length === 0) {
    return candidateId;
  }

  // Fallback random suffix if sequence collision occurs
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BK-${dateSegment}-${randomSuffix}`;
}

/**
 * Atomic reservation engine with database-level concurrency protection.
 * Executes inside an ACID transaction.
 */
export async function createBookingAtomic(params: {
  userId: number;
  flatId?: number;
  roomOption?: RoomSelectionOption;
  roomIds?: number[];
  fullName: string;
  mobileNumber: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  numberOfPersons: number;
  specialRequests?: string;
}): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const flatId = params.flatId || 1;

  const normInDate = normalizeDateYYYYMMDD(params.checkInDate);
  const normInTime = normalizeTime24H(params.checkInTime);
  const normOutDate = normalizeDateYYYYMMDD(params.checkOutDate);
  const normOutTime = normalizeTime24H(params.checkOutTime);

  const checkInDateObj = parseDateTimeToDate(normInDate, normInTime);
  const checkOutDateObj = parseDateTimeToDate(normOutDate, normOutTime);

  if (isNaN(checkInDateObj.getTime()) || isNaN(checkOutDateObj.getTime())) {
    return { success: false, error: 'Invalid check-in or check-out date and time.' };
  }

  if (checkOutDateObj.getTime() <= checkInDateObj.getTime()) {
    return { success: false, error: 'Check-out date and time must be after check-in date and time.' };
  }

  const reqCheckInAt = toMySQLDateTime(normInDate, normInTime);
  const reqCheckOutAt = toMySQLDateTime(normOutDate, normOutTime);

  try {
    const bookingId = await withTransaction(async (conn) => {
      // 1. Verify user
      const [userRows] = await conn.query<any>(
        "SELECT * FROM users WHERE id = ? AND status = 'active'",
        [params.userId]
      );
      if (userRows.length === 0) {
        throw new Error('User account is invalid or inactive.');
      }

      // 2. Verify flat
      const [flatRows] = await conn.query<Flat>(
        'SELECT * FROM flats WHERE id = ?',
        [flatId]
      );
      if (flatRows.length === 0) {
        throw new Error('Flat not found.');
      }
      const flat = flatRows[0] as Flat;
      if (flat.status !== 'active') {
        throw new Error('The flat is currently under maintenance.');
      }

      // 3. Fetch all rooms for this flat
      const [allRoomRows] = await conn.query<Room>(
        'SELECT * FROM rooms WHERE flat_id = ? ORDER BY id ASC',
        [flatId]
      );
      const allRooms = allRoomRows as Room[];

      if (allRooms.length === 0) {
        throw new Error('No rooms configured for this flat.');
      }

      const room1 = allRooms[0];
      const room2 = allRooms[1];

      // 4. Concurrency overlap check inside transaction boundary
      const [conflictRows] = await conn.query<any>(
        `
        SELECT 
          b.id,
          b.booking_id,
          br.room_id,
          r.room_name
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

      const occupiedRoomIds = new Set(conflictRows.map((c: any) => c.room_id));

      const room1Free = room1 && room1.status === 'available' && !occupiedRoomIds.has(room1.id);
      const room2Free = room2 && room2.status === 'available' && !occupiedRoomIds.has(room2.id);

      // 5. Determine which rooms to assign based on roomOption or roomIds
      let finalRoomIds: number[] = [];
      const requestedOption = params.roomOption || (params.roomIds && params.roomIds.length === 2 ? 'both' : (params.roomIds && params.roomIds[0] === 2 ? 'room2' : (params.roomIds && params.roomIds[0] === 1 ? 'room1' : 'auto')));

      if (requestedOption === 'both' || (params.roomIds && params.roomIds.length === 2)) {
        if (!room1Free && !room2Free) {
          throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        }
        if (!room1Free || !room2Free) {
          const occupiedName = !room1Free ? 'Room 1' : 'Room 2';
          throw new Error(`Both rooms cannot be booked because ${occupiedName} is already booked for the selected date/time.`);
        }
        finalRoomIds = [room1.id, room2.id];
      } else if (requestedOption === 'room1' || (params.roomIds && params.roomIds.length === 1 && params.roomIds[0] === room1?.id)) {
        if (!room1Free) {
          if (room2Free) {
            throw new Error('Room 1 is unavailable for the selected date and time. Room 2 is available if you wish to book it instead.');
          }
          throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        }
        finalRoomIds = [room1.id];
      } else if (requestedOption === 'room2' || (params.roomIds && params.roomIds.length === 1 && params.roomIds[0] === room2?.id)) {
        if (!room2Free) {
          if (room1Free) {
            throw new Error('Room 2 is unavailable for the selected date and time. Room 1 is available if you wish to book it instead.');
          }
          throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        }
        finalRoomIds = [room2.id];
      } else {
        // Automatic Room Assignment: Assign Room 1 if free, otherwise Room 2
        if (room1Free) {
          finalRoomIds = [room1.id];
        } else if (room2Free) {
          finalRoomIds = [room2.id];
        } else {
          throw new Error('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        }
      }

      // 6. Capacity validations
      const totalMaxAllowed = flat.max_capacity || 10;
      if (params.numberOfPersons <= 0) {
        throw new Error('Number of persons must be at least 1.');
      }
      if (params.numberOfPersons > totalMaxAllowed) {
        throw new Error(`Maximum capacity is ${totalMaxAllowed} persons.`);
      }

      if (finalRoomIds.length === 1) {
        const assignedRoom = allRooms.find((r) => r.id === finalRoomIds[0]);
        const singleRoomMax = assignedRoom?.capacity || 5;
        if (params.numberOfPersons > singleRoomMax) {
          throw new Error(
            `${assignedRoom?.room_name || 'Single room'} can accommodate up to ${singleRoomMax} persons. For ${params.numberOfPersons} persons, please select Both Rooms.`
          );
        }
      }

      // 7. Generate unique booking ID
      const newBookingId = await generateBookingId(conn, normInDate);

      // 8. Insert into bookings table
      const [insertResult] = await conn.execute(
        `
        INSERT INTO bookings (
          booking_id, user_id, flat_id, check_in_date, check_in_time,
          check_out_date, check_out_time, check_in_at, check_out_at,
          number_of_persons, status, special_requests
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
      `,
        [
          newBookingId,
          params.userId,
          flatId,
          normInDate,
          normInTime,
          normOutDate,
          normOutTime,
          reqCheckInAt,
          reqCheckOutAt,
          params.numberOfPersons,
          params.specialRequests || null,
        ]
      );

      const newBookingDbId = insertResult.insertId;

      // 9. Insert into booking_rooms relationship table
      for (const rId of finalRoomIds) {
        await conn.execute(
          'INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, ?)',
          [newBookingDbId, rId]
        );
      }

      return newBookingId;
    });

    const fullBooking = await getBookingById(bookingId);
    if (!fullBooking) {
      return { success: false, error: 'Could not retrieve created booking.' };
    }
    return { success: true, booking: fullBooking };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during reservation.',
    };
  }
}

/**
 * Fetch formatted booking details by booking_id string or database integer id
 */
export async function getBookingById(bookingIdOrId: string | number): Promise<Booking | null> {
  const isNumeric = typeof bookingIdOrId === 'number' || /^\d+$/.test(bookingIdOrId.toString());

  const booking = await queryOne<any>(
    isNumeric
      ? `
        SELECT b.*, u.full_name as user_name, u.email as user_email, u.mobile_number as user_mobile, f.flat_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN flats f ON b.flat_id = f.id
        WHERE b.id = ?
      `
      : `
        SELECT b.*, u.full_name as user_name, u.email as user_email, u.mobile_number as user_mobile, f.flat_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN flats f ON b.flat_id = f.id
        WHERE b.booking_id = ?
      `,
    [bookingIdOrId]
  );

  if (!booking) return null;

  // Fetch rooms for this booking
  const roomRows = await query<{ id: number; room_name: string; room_type: string }>(
    `
      SELECT r.id, r.room_name, r.room_type
      FROM booking_rooms br
      JOIN rooms r ON br.room_id = r.id
      WHERE br.booking_id = ?
      ORDER BY r.id ASC
    `,
    [booking.id]
  );

  const roomIds = roomRows.map((r) => r.id);
  const roomsDisplay =
    roomRows.length === 2 ? 'Both Rooms (Room 1 & Room 2)' : roomRows.map((r) => r.room_name).join(', ');

  return {
    ...booking,
    full_name: booking.user_name,
    mobile_number: booking.user_mobile,
    rooms: roomRows,
    room_ids: roomIds,
    rooms_display: roomsDisplay,
  };
}

/**
 * Cancel an active booking with atomic authorization verification
 */
export async function cancelBookingAtomic(
  bookingId: string,
  userId: number,
  isAdmin: boolean,
  cancellationReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await withTransaction(async (conn) => {
      const [bookingRows] = await conn.query<Booking>(
        'SELECT * FROM bookings WHERE booking_id = ?',
        [bookingId]
      );

      if (bookingRows.length === 0) {
        throw new Error('Booking not found.');
      }

      const booking = bookingRows[0] as Booking;

      if (!isAdmin && booking.user_id !== userId) {
        throw new Error('Unauthorized to cancel this booking.');
      }

      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled.');
      }

      const cancelledBy = isAdmin ? 'admin' : 'user';
      const reason = cancellationReason || (isAdmin ? 'Admin canceled your room booking' : 'Cancelled by guest');

      await conn.execute(
        `UPDATE bookings 
         SET status = 'cancelled', 
             cancelled_by = ?, 
             cancellation_reason = ?, 
             cancelled_at = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE booking_id = ?`,
        [cancelledBy, reason, bookingId]
      );
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin updates booking status with atomic conflict validation to prevent overlapping activations.
 */
export async function updateBookingStatusAtomic(
  bookingId: number | string,
  newStatus: string,
  options?: { cancelledBy?: string; cancellationReason?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await withTransaction(async (conn) => {
      const [bookingRows] = await conn.query<Booking>(
        'SELECT * FROM bookings WHERE id = ? OR booking_id = ?',
        [bookingId, bookingId]
      );

      if (bookingRows.length === 0) {
        throw new Error('Booking not found.');
      }

      const booking = bookingRows[0] as Booking;

      // If reviving to confirmed or pending, verify that room(s) are not already occupied
      if (['confirmed', 'pending'].includes(newStatus)) {
        const [assignedRooms] = await conn.query<{ room_id: number }>(
          'SELECT room_id FROM booking_rooms WHERE booking_id = ?',
          [booking.id]
        );
        const roomIds = assignedRooms.map((r: any) => r.room_id);

        if (roomIds.length > 0) {
          const placeholders = roomIds.map(() => '?').join(',');
          const [conflicts] = await conn.query<any>(
            `
            SELECT b.booking_id, r.room_name
            FROM bookings b
            JOIN booking_rooms br ON br.booking_id = b.id
            JOIN rooms r ON br.room_id = r.id
            WHERE b.flat_id = ?
              AND b.id != ?
              AND br.room_id IN (${placeholders})
              AND b.status IN ('confirmed', 'pending', 'completed')
              AND b.check_in_at < ?
              AND b.check_out_at > ?
          `,
            [booking.flat_id, booking.id, ...roomIds, booking.check_out_at, booking.check_in_at]
          );

          if (conflicts.length > 0) {
            const conflictInfo = conflicts.map((c: any) => `${c.room_name} (${c.booking_id})`).join(', ');
            throw new Error(`Cannot reactivate booking: Conflict with active booking on ${conflictInfo}.`);
          }
        }
      }

      if (newStatus === 'cancelled') {
        const cancelledBy = options?.cancelledBy || 'admin';
        const reason = options?.cancellationReason || 'Admin canceled your room booking';
        await conn.execute(
          `UPDATE bookings 
           SET status = 'cancelled', 
               cancelled_by = ?, 
               cancellation_reason = ?, 
               cancelled_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [cancelledBy, reason, booking.id]
        );
      } else {
        await conn.execute(
          `UPDATE bookings 
           SET status = ?, 
               cancelled_by = NULL, 
               cancellation_reason = NULL, 
               cancelled_at = NULL, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [newStatus, booking.id]
        );
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
