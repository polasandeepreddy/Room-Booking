import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, signToken, AUTH_COOKIE_NAME, isValidMobileNumber } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { createBookingAtomic } from '@/lib/booking-engine';
import { Booking, User } from '@/lib/types';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const rows = await query<any>(
      `
      SELECT b.*, f.flat_name
      FROM bookings b
      JOIN flats f ON b.flat_id = f.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `,
      [user.id]
    );

    // Enrich with rooms
    const bookings: Booking[] = await Promise.all(
      rows.map(async (b) => {
        const roomRows = await query<{ id: number; room_name: string; room_type: string }>(
          `
        SELECT r.id, r.room_name, r.room_type
        FROM booking_rooms br
        JOIN rooms r ON br.room_id = r.id
        WHERE br.booking_id = ?
      `,
          [b.id]
        );

        return {
          ...b,
          full_name: user.full_name,
          user_email: user.email,
          mobile_number: user.mobile_number,
          rooms: roomRows,
          room_ids: roomRows.map((r) => r.id),
          rooms_display:
            roomRows.length === 2
              ? 'Both Rooms (Room 1 & Room 2)'
              : roomRows.map((r) => r.room_name).join(', '),
        };
      })
    );

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch bookings.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      flatId,
      roomOption,
      roomIds,
      fullName,
      email,
      mobileNumber,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      numberOfPersons,
      specialRequests,
    } = body;

    // Validate inputs
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full Name is required.' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid Email address is required.' }, { status: 400 });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return NextResponse.json({ error: 'Mobile Number is required.' }, { status: 400 });
    }

    if (!isValidMobileNumber(mobileNumber.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid phone number (minimum 8 digits).' },
        { status: 400 }
      );
    }

    const persons = Number(numberOfPersons);
    if (isNaN(persons) || persons < 1 || persons > 10) {
      return NextResponse.json(
        { error: 'Maximum capacity is 10 persons (Minimum 1 person).' },
        { status: 400 }
      );
    }

    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      return NextResponse.json(
        { error: 'Check-in and Check-out dates and times are required.' },
        { status: 400 }
      );
    }

    const parsedRoomIds: number[] | undefined = Array.isArray(roomIds) && roomIds.length > 0
      ? roomIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
      : undefined;

    // Determine or create User
    let currentUser = await getCurrentUser();
    let tokenToSet: string | null = null;

    if (!currentUser) {
      const cleanEmail = email.trim().toLowerCase();
      let existingUser = await queryOne<User>('SELECT * FROM users WHERE email = ?', [cleanEmail]);

      if (!existingUser) {
        // Auto-create guest user record
        const tempPassword = Math.random().toString(36).substring(2, 10) + '!A1';
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const insertUser = await execute(
          `
          INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
          VALUES (?, ?, ?, ?, 'user', 'active')
        `,
          [fullName.trim(), cleanEmail, passwordHash, mobileNumber.trim()]
        );

        existingUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [
          insertUser.insertId,
        ]);
      } else {
        // Update user's name or phone if provided
        await execute('UPDATE users SET full_name = ?, mobile_number = ? WHERE id = ?', [
          fullName.trim(),
          mobileNumber.trim(),
          existingUser.id,
        ]);
      }

      currentUser = existingUser;

      // Create JWT session token for the user so they are authenticated
      if (currentUser) {
        tokenToSet = await signToken({
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.full_name,
          role: currentUser.role,
        });
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unable to establish booking user profile.' },
        { status: 500 }
      );
    }

    const result = await createBookingAtomic({
      userId: currentUser.id,
      flatId: flatId ? Number(flatId) : 1,
      roomOption: roomOption || undefined,
      roomIds: parsedRoomIds,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      numberOfPersons: persons,
      specialRequests: specialRequests ? String(specialRequests).trim() : undefined,
    });

    if (!result.success) {
      const isConflict = result.error?.includes('unavailable') || result.error?.includes('booked') || result.error?.includes('Conflict');
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Booking Confirmed',
      booking: result.booking,
    }, { status: 201 });

    // Set auth cookie if guest was logged in during booking
    if (tokenToSet) {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: tokenToSet,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create booking.' },
      { status: 500 }
    );
  }
}
