import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Facility } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const facilities = await query<Facility>(
      "SELECT * FROM facilities WHERE status = 'active' ORDER BY id ASC"
    );

    return NextResponse.json({
      success: true,
      facilities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch facilities.' },
      { status: 500 }
    );
  }
}
