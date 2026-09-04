import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { Facility } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const facilities = await query<Facility>('SELECT * FROM facilities ORDER BY id ASC');

    return NextResponse.json({ success: true, facilities });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch facilities.' },
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
    const { name, description, icon, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Facility name is required.' }, { status: 400 });
    }

    const result = await execute(
      `
      INSERT INTO facilities (name, description, icon, status)
      VALUES (?, ?, ?, ?)
    `,
      [
        name.trim(),
        description ? description.trim() : '',
        icon || 'Sparkles',
        status || 'active',
      ]
    );

    const newFacility = await queryOne<Facility>('SELECT * FROM facilities WHERE id = ?', [
      result.insertId,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Facility added successfully.',
      facility: newFacility,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create facility.' },
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
    const { id, name, description, icon, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Facility ID is required.' }, { status: 400 });
    }

    await execute(
      `
      UPDATE facilities 
      SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [
        name ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        icon || null,
        status || null,
        id,
      ]
    );

    const updated = await queryOne<Facility>('SELECT * FROM facilities WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Facility updated successfully.',
      facility: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update facility.' },
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
      return NextResponse.json({ error: 'Facility ID is required.' }, { status: 400 });
    }

    await execute('DELETE FROM facilities WHERE id = ?', [Number(id)]);

    return NextResponse.json({
      success: true,
      message: 'Facility deleted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete facility.' },
      { status: 500 }
    );
  }
}
