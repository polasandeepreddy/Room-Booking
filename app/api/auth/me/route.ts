import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobileNumber: user.mobile_number,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
