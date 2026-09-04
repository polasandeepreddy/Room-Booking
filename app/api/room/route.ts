import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Room, Facility } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all rooms
    const rooms = await query<Room>('SELECT * FROM rooms WHERE flat_id = 1 ORDER BY id ASC');

    // Fetch active facilities
    const facilities = await query<Facility>("SELECT * FROM facilities WHERE status = 'active' ORDER BY id ASC");

    return NextResponse.json({
      rooms,
      room: rooms[0] || null,
      facilities,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch room details.' }, { status: 500 });
  }
}
