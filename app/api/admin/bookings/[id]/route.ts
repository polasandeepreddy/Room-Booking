import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { execute } from '@/lib/db';
import { getBookingById, updateBookingStatusAtomic } from '@/lib/booking-engine';
import { toMySQLDateTime, normalizeDateYYYYMMDD, normalizeTime24H } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch booking details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { status, numberOfPersons, specialRequests, checkInDate, checkInTime, checkOutDate, checkOutTime, cancellationReason } = body;

    // If status is changing, use atomic status updater with overlap protection and cancellation tracking
    if (status && ['confirmed', 'pending', 'cancelled', 'completed'].includes(status)) {
      const statusRes = await updateBookingStatusAtomic(booking.id, status, {
        cancelledBy: 'admin',
        cancellationReason: cancellationReason || 'Admin canceled your room booking',
      });
      if (!statusRes.success) {
        return NextResponse.json({ error: statusRes.error }, { status: 409 });
      }
    }

    // Prepare other updates if any
    let updateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    let updateValues: any[] = [];

    if (numberOfPersons && Number(numberOfPersons) >= 1 && Number(numberOfPersons) <= 10) {
      updateFields.push('number_of_persons = ?');
      updateValues.push(Number(numberOfPersons));
    }

    if (specialRequests !== undefined) {
      updateFields.push('special_requests = ?');
      updateValues.push(specialRequests);
    }

    const newInDate = checkInDate ? normalizeDateYYYYMMDD(checkInDate) : booking.check_in_date;
    const newInTime = checkInTime ? normalizeTime24H(checkInTime) : booking.check_in_time;
    const newOutDate = checkOutDate ? normalizeDateYYYYMMDD(checkOutDate) : booking.check_out_date;
    const newOutTime = checkOutTime ? normalizeTime24H(checkOutTime) : booking.check_out_time;

    if (checkInDate || checkInTime) {
      updateFields.push('check_in_date = ?', 'check_in_time = ?', 'check_in_at = ?');
      updateValues.push(newInDate, newInTime, toMySQLDateTime(newInDate, newInTime));
    }

    if (checkOutDate || checkOutTime) {
      updateFields.push('check_out_date = ?', 'check_out_time = ?', 'check_out_at = ?');
      updateValues.push(newOutDate, newOutTime, toMySQLDateTime(newOutDate, newOutTime));
    }

    if (updateFields.length > 1) {
      updateValues.push(booking.id);
      await execute(`UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
    }

    const updatedBooking = await getBookingById(booking.id);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully.',
      booking: updatedBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update booking.' },
      { status: 500 }
    );
  }
}
