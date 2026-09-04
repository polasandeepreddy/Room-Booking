import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { SettingItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const rows = await query<SettingItem>('SELECT * FROM settings ORDER BY id ASC');

    const settingsMap: Record<string, string> = {};
    rows.forEach((r) => {
      settingsMap[r.setting_key] = r.setting_value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      raw: rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch settings.' },
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
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required.' }, { status: 400 });
    }

    await withTransaction(async (conn) => {
      for (const [key, val] of Object.entries(settings)) {
        if (typeof val === 'string' || typeof val === 'number') {
          await conn.execute(
            `
            INSERT INTO settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(setting_key) DO UPDATE SET
              setting_value = excluded.setting_value,
              updated_at = CURRENT_TIMESTAMP
          `,
            [key, String(val)]
          );
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update settings.' },
      { status: 500 }
    );
  }
}
