import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cancelBookingAtomic, getBookingById } from '@/lib/booking-engine';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    let cancellationReason: string | undefined;
    try {
      const body = await req.json();
      cancellationReason = body?.cancellationReason || body?.reason;
    } catch (_) {
      // Body is optional
    }

    const result = await cancelBookingAtomic(
      booking.booking_id,
      user.id,
      user.role === 'admin',
      cancellationReason
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedBooking = await getBookingById(booking.booking_id);

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: updatedBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to cancel booking.' },
      { status: 500 }
    );
  }
}
