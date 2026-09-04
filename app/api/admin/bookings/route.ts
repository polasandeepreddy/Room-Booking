import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { Booking } from '@/lib/types';
import { purgeBookingsOlderThanDays } from '@/lib/booking-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    // Automatically remove bookings older than 30 days to enforce retention policy
    await purgeBookingsOlderThanDays(30);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const roomId = searchParams.get('roomId') || 'all';
    const date = searchParams.get('date') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let whereClauses: string[] = ['1=1'];
    let params: any[] = [];

    // Search by Booking ID, Guest Name, Mobile, Email
    if (search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      whereClauses.push(
        `(b.booking_id LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.mobile_number LIKE ?)`
      );
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Status filter
    if (status && status !== 'all') {
      whereClauses.push(`b.status = ?`);
      params.push(status);
    }

    // Date filter (active during that date)
    if (date) {
      whereClauses.push(`(b.check_in_date <= ? AND b.check_out_date >= ?)`);
      params.push(date, date);
    }

    // Room filter
    if (roomId && roomId !== 'all') {
      whereClauses.push(`EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_id = b.id AND br.room_id = ?)`);
      params.push(Number(roomId));
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count query
    const totalCountRow = await queryOne<{ total: number }>(
      `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN flats f ON b.flat_id = f.id
      WHERE ${whereSql}
    `,
      params
    );

    const total = Number(totalCountRow?.total || 0);

    // Fetch paginated bookings
    const rows = await query<any>(
      `
      SELECT 
        b.*,
        u.full_name as guest_name,
        u.email as guest_email,
        u.mobile_number as guest_mobile,
        f.flat_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN flats f ON b.flat_id = f.id
      WHERE ${whereSql}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    );

    // Enrich rows with rooms
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
          full_name: b.guest_name,
          user_email: b.guest_email,
          mobile_number: b.guest_mobile,
          rooms: roomRows,
          room_ids: roomRows.map((r) => r.id),
          rooms_display:
            roomRows.length === 2 ? 'Both Rooms (Room 1 & Room 2)' : roomRows.map((r) => r.room_name).join(', '),
        };
      })
    );

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch admin bookings.' },
      { status: 500 }
    );
  }
}
