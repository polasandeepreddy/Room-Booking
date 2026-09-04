import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { Room } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const rooms = await query<Room>('SELECT * FROM rooms ORDER BY id ASC');

    return NextResponse.json({ success: true, rooms });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch rooms.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { flatId, roomName, roomType, description, capacity, status, imageUrl } = body;

    if (!roomName || !roomType) {
      return NextResponse.json({ error: 'Room Name and Room Type are required.' }, { status: 400 });
    }

    const result = await execute(
      `
      INSERT INTO rooms (flat_id, room_name, room_type, description, capacity, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        flatId || 1,
        roomName,
        roomType,
        description || '',
        capacity ? Number(capacity) : 5,
        status || 'available',
        imageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      ]
    );

    const newRoom = await queryOne<Room>('SELECT * FROM rooms WHERE id = ?', [result.insertId]);

    return NextResponse.json({
      success: true,
      message: 'Room created successfully.',
      room: newRoom,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create room.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, roomName, roomType, description, capacity, status, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });
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
        capacity ? Number(capacity) : null,
        status || null,
        imageUrl || null,
        id,
      ]
    );

    const updatedRoom = await queryOne<Room>('SELECT * FROM rooms WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Room updated successfully.',
      room: updatedRoom,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update room.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });
    }

    // Do not delete if total rooms <= 1 to protect base system
    const countRow = await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM rooms');
    const count = Number(countRow?.cnt || 0);
    if (count <= 2) {
      return NextResponse.json(
        { error: 'Cannot delete default property rooms. You can disable them or set to maintenance instead.' },
        { status: 400 }
      );
    }

    await execute('DELETE FROM rooms WHERE id = ?', [Number(id)]);

    return NextResponse.json({ success: true, message: 'Room removed successfully.' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete room.' },
      { status: 500 }
    );
  }
}
