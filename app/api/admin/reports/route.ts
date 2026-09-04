import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const exportCsv = searchParams.get('export') === 'csv';

    let dateFilter = '1=1';
    let params: any[] = [];

    if (startDate && endDate) {
      dateFilter = 'b.check_in_date >= ? AND b.check_in_date <= ?';
      params.push(startDate, endDate);
    }

    // Summary numbers
    const totalRow = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM bookings b WHERE ${dateFilter}`,
      params
    );
    const totalBookings = Number(totalRow?.cnt || 0);

    const confirmedRow = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM bookings b WHERE b.status = 'confirmed' AND ${dateFilter}`,
      params
    );
    const confirmedBookings = Number(confirmedRow?.cnt || 0);

    const cancelledRow = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM bookings b WHERE b.status = 'cancelled' AND ${dateFilter}`,
      params
    );
    const cancelledBookings = Number(cancelledRow?.cnt || 0);

    const completedRow = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM bookings b WHERE b.status = 'completed' AND ${dateFilter}`,
      params
    );
    const completedBookings = Number(completedRow?.cnt || 0);

    const guestsRow = await queryOne<{ cnt: number }>(
      `SELECT COALESCE(SUM(b.number_of_persons), 0) as cnt FROM bookings b WHERE b.status IN ('confirmed', 'completed') AND ${dateFilter}`,
      params
    );
    const totalGuestsServed = Number(guestsRow?.cnt || 0);

    // Bookings by date (last 30 entries)
    const bookingsByDate = await query(
      `
      SELECT 
        b.check_in_date as date,
        COUNT(*) as total_count,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM bookings b
      WHERE ${dateFilter}
      GROUP BY b.check_in_date
      ORDER BY b.check_in_date DESC
      LIMIT 30
    `,
      params
    );

    // Bookings by month (last 12 months)
    const bookingsByMonth = await query(
      `
      SELECT 
        SUBSTRING(b.check_in_date, 1, 7) as month,
        COUNT(*) as total_count,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM bookings b
      WHERE ${dateFilter}
      GROUP BY SUBSTRING(b.check_in_date, 1, 7)
      ORDER BY month DESC
      LIMIT 12
    `,
      params
    );

    // Bookings by room selection (Room 1 vs Room 2 vs Both)
    const allFilteredBookings = await query<any>(
      `
      SELECT 
        b.id,
        b.booking_id,
        u.full_name as guest_name,
        u.email as guest_email,
        u.mobile_number as guest_mobile,
        f.flat_name,
        b.check_in_date,
        b.check_in_time,
        b.check_out_date,
        b.check_out_time,
        b.number_of_persons,
        b.status,
        b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN flats f ON b.flat_id = f.id
      WHERE ${dateFilter}
      ORDER BY b.created_at DESC
    `,
      params
    );

    const enrichedRows = await Promise.all(
      allFilteredBookings.map(async (b) => {
        const roomRows = await query<{ room_name: string }>(
          `
        SELECT r.room_name 
        FROM booking_rooms br 
        JOIN rooms r ON br.room_id = r.id 
        WHERE br.booking_id = ?
      `,
          [b.id]
        );

        const roomStr =
          roomRows.length === 2
            ? 'Both Rooms (Room 1 & Room 2)'
            : roomRows.map((r) => r.room_name).join(', ');
        return {
          ...b,
          rooms_display: roomStr,
        };
      })
    );

    // Handle CSV Export
    if (exportCsv) {
      const headers = [
        'Booking ID',
        'Guest Name',
        'Email',
        'Mobile',
        'Flat',
        'Rooms',
        'Check-In Date',
        'Check-In Time',
        'Check-Out Date',
        'Check-Out Time',
        'Persons',
        'Status',
        'Created At',
      ];

      const csvRows = [headers.join(',')];

      for (const r of enrichedRows) {
        const row = [
          `"${r.booking_id}"`,
          `"${(r.guest_name || '').replace(/"/g, '""')}"`,
          `"${r.guest_email || ''}"`,
          `"${r.guest_mobile || ''}"`,
          `"${r.flat_name || ''}"`,
          `"${r.rooms_display}"`,
          `"${r.check_in_date}"`,
          `"${r.check_in_time}"`,
          `"${r.check_out_date}"`,
          `"${r.check_out_time}"`,
          r.number_of_persons,
          `"${(r.status || '').toUpperCase()}"`,
          `"${r.created_at}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="booking-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report: {
        summary: {
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          completedBookings,
          totalGuestsServed,
        },
        bookingsByDate,
        bookingsByMonth,
        recentBookings: enrichedRows.slice(0, 50),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate reports.' },
      { status: 500 }
    );
  }
}
