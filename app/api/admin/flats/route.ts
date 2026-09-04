import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { Flat } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const flat = await queryOne<Flat>('SELECT * FROM flats WHERE id = 1');
    if (!flat) {
      return NextResponse.json({ error: 'Flat not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, flat });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch flat.' },
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
    const { flatName, description, maxCapacity, status, imageUrl } = body;

    const flat = await queryOne<Flat>('SELECT * FROM flats WHERE id = 1');
    if (!flat) {
      return NextResponse.json({ error: 'Flat not found.' }, { status: 404 });
    }

    await execute(
      `
      UPDATE flats 
      SET 
        flat_name = COALESCE(?, flat_name),
        description = COALESCE(?, description),
        max_capacity = COALESCE(?, max_capacity),
        status = COALESCE(?, status),
        image_url = COALESCE(?, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
      [
        flatName || null,
        description || null,
        maxCapacity ? Number(maxCapacity) : null,
        status || null,
        imageUrl || null,
      ]
    );

    const updatedFlat = await queryOne<Flat>('SELECT * FROM flats WHERE id = 1');

    return NextResponse.json({
      success: true,
      message: 'Flat updated successfully.',
      flat: updatedFlat,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update flat.' },
      { status: 500 }
    );
  }
}
