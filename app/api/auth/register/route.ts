import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '@/lib/db';
import { isValidMobileNumber } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, mobileNumber, password, confirmPassword } = body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!mobileNumber || !isValidMobileNumber(mobileNumber)) {
      return NextResponse.json(
        { error: 'Please provide a valid mobile number (minimum 8 digits).' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Check duplicate email
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    await execute(
      `
      INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
      VALUES (?, ?, ?, ?, 'user', 'active')
    `,
      [
        fullName.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        mobileNumber.trim(),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please login.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to register user.' },
      { status: 500 }
    );
  }
}
