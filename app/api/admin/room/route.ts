import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { Room } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const userPayload = await getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      roomId = 1,
      roomName,
      roomType,
      description,
      capacity,
      status,
      imageUrl,
    } = body;

    // Check if room exists
    const current = await queryOne<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!current) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    await execute(
      `
      UPDATE rooms 
      SET 
        room_name = COALESCE(?, room_name),
        room_type = COALESCE(?, room_type),
        description = COALESCE(?, description),
        capacity = COALESCE(?, capacity),
        status = COALESCE(?, status),
        image_url = COALESCE(?, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [
        roomName || null,
        roomType || null,
        description || null,
        capacity !== undefined ? Number(capacity) : null,
        status || null,
        imageUrl || null,
        roomId,
      ]
    );

    const updated = await queryOne<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);

    return NextResponse.json({
      success: true,
      message: 'Room details updated successfully.',
      room: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error updating room.' }, { status: 500 });
  }
}
