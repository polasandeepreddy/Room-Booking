import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { purgeBookingsOlderThanDays } from '@/lib/booking-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    let days = 30;
    try {
      const body = await req.json();
      if (body.days && Number(body.days) > 0) {
        days = Number(body.days);
      }
    } catch (_) {
      // Body is optional, default 30 days
    }

    const result = await purgeBookingsOlderThanDays(days);

    return NextResponse.json({
      success: true,
      message: result.deletedCount > 0 
        ? `Successfully removed ${result.deletedCount} booking record(s) older than ${days} days.`
        : `No bookings older than ${days} days were found. Database is already clean.`,
      deletedCount: result.deletedCount,
      deletedBookingIds: result.deletedBookingIds,
      retentionDays: days,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to cleanup old bookings.' },
      { status: 500 }
    );
  }
}
