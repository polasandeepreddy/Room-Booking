import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || ''; // YYYY-MM-DD
    const end = searchParams.get('end') || ''; // YYYY-MM-DD

    let whereSql = `1=1`;
    let params: any[] = [];

    if (start && end) {
      whereSql += ` AND (b.check_in_date <= ? AND b.check_out_date >= ?)`;
      params.push(end, start);
    }

    const rows = await query<any>(
      `
      SELECT 
        b.id,
        b.booking_id,
        b.user_id,
        b.flat_id,
        b.check_in_date,
        b.check_in_time,
        b.check_out_date,
        b.check_out_time,
        b.number_of_persons,
        b.status,
        b.special_requests,
        u.full_name as guest_name,
        u.mobile_number as guest_mobile,
        u.email as guest_email,
        f.flat_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN flats f ON b.flat_id = f.id
      WHERE ${whereSql}
      ORDER BY b.check_in_date ASC
    `,
      params
    );

    const calendarEvents = await Promise.all(
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
          id: b.id,
          bookingId: b.booking_id,
          title: `${b.guest_name} (${roomRows.map((r) => r.room_name).join(', ')})`,
          guestName: b.guest_name,
          guestEmail: b.guest_email,
          guestMobile: b.guest_mobile,
          checkInDate: b.check_in_date,
          checkInTime: b.check_in_time,
          checkOutDate: b.check_out_date,
          checkOutTime: b.check_out_time,
          start: `${b.check_in_date}T${b.check_in_time}`,
          end: `${b.check_out_date}T${b.check_out_time}`,
          numberOfPersons: b.number_of_persons,
          status: b.status,
          rooms: roomRows,
          roomIds: roomRows.map((r) => r.id),
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: calendarEvents,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch calendar events.' },
      { status: 500 }
    );
  }
}
