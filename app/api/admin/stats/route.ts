import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { Room } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Total counts
    const totalRow = await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM bookings');
    const totalBookings = Number(totalRow?.cnt || 0);

    const confRow = await queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'confirmed'");
    const confirmedBookings = Number(confRow?.cnt || 0);

    const cancRow = await queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'cancelled'");
    const cancelledBookings = Number(cancRow?.cnt || 0);

    const compRow = await queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'completed'");
    const completedBookings = Number(compRow?.cnt || 0);

    // Today bookings (check_in_date = today or check_out_date = today)
    const todayRow = await queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM bookings WHERE check_in_date = ? AND status IN ('confirmed', 'pending')",
      [today]
    );
    const todayBookings = Number(todayRow?.cnt || 0);

    // Upcoming bookings (check_in_date > today)
    const upcomingRow = await queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM bookings WHERE check_in_date > ? AND status IN ('confirmed', 'pending')",
      [today]
    );
    const upcomingBookings = Number(upcomingRow?.cnt || 0);

    // Total Users (role = 'user')
    const userCountRow = await queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'");
    const totalUsers = Number(userCountRow?.cnt || 0);

    // 2. Real-time Room 1 & Room 2 status
    const rooms = await query<Room>('SELECT * FROM rooms WHERE flat_id = 1 ORDER BY id ASC');
    const room1 = rooms[0] || { id: 1, room_name: 'Room 1', status: 'available' };
    const room2 = rooms[1] || { id: 2, room_name: 'Room 2', status: 'available' };

    // Check active occupant for Room 1 right now
    const currentOccupant1 = await queryOne<any>(
      `
      SELECT b.booking_id, u.full_name as guest_name, b.check_in_date, b.check_in_time, b.check_out_date, b.check_out_time
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE br.room_id = ?
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND b.check_in_at <= datetime('now', 'localtime')
        AND b.check_out_at > datetime('now', 'localtime')
      ORDER BY b.check_in_at DESC
      LIMIT 1
    `,
      [room1.id]
    );

    const currentOccupant2 = await queryOne<any>(
      `
      SELECT b.booking_id, u.full_name as guest_name, b.check_in_date, b.check_in_time, b.check_out_date, b.check_out_time
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE br.room_id = ?
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND b.check_in_at <= datetime('now', 'localtime')
        AND b.check_out_at > datetime('now', 'localtime')
      ORDER BY b.check_in_at DESC
      LIMIT 1
    `,
      [room2.id]
    );

    const roomAvailability = {
      room1: {
        id: room1.id,
        name: room1.room_name,
        status: (room1.status === 'maintenance' ? 'maintenance' : currentOccupant1 ? 'occupied' : 'available') as 'available' | 'occupied' | 'maintenance',
        currentBooking: currentOccupant1
          ? {
              bookingId: currentOccupant1.booking_id,
              guestName: currentOccupant1.guest_name,
              checkIn: `${currentOccupant1.check_in_date} ${currentOccupant1.check_in_time}`,
              checkOut: `${currentOccupant1.check_out_date} ${currentOccupant1.check_out_time}`,
            }
          : undefined,
      },
      room2: {
        id: room2.id,
        name: room2.room_name,
        status: (room2.status === 'maintenance' ? 'maintenance' : currentOccupant2 ? 'occupied' : 'available') as 'available' | 'occupied' | 'maintenance',
        currentBooking: currentOccupant2
          ? {
              bookingId: currentOccupant2.booking_id,
              guestName: currentOccupant2.guest_name,
              checkIn: `${currentOccupant2.check_in_date} ${currentOccupant2.check_in_time}`,
              checkOut: `${currentOccupant2.check_out_date} ${currentOccupant2.check_out_time}`,
            }
          : undefined,
      },
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalBookings,
        todayBookings,
        upcomingBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        totalUsers,
        roomAvailability,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch admin stats.' },
      { status: 500 }
    );
  }
}
