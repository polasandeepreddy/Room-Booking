import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Flat, Room } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Fetch the flat
    const flat = await queryOne<Flat>('SELECT * FROM flats WHERE id = 1');
    if (!flat) {
      return NextResponse.json({ error: 'Flat not found.' }, { status: 404 });
    }

    // Fetch rooms belonging to this flat
    const rooms = await query<Room>(
      'SELECT * FROM rooms WHERE flat_id = ? ORDER BY id ASC',
      [flat.id]
    );

    return NextResponse.json({
      success: true,
      flat: {
        ...flat,
        rooms,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch flat details.' },
      { status: 500 }
    );
  }
}
