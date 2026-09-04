import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBookingById } from '@/lib/booking-engine';

export const dynamic = 'force-dynamic';

export async function GET(
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

    // Authorization check: only owner or admin can view
    if (user.role !== 'admin' && booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch booking details.' },
      { status: 500 }
    );
  }
}
