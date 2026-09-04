import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser, isValidMobileNumber } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, mobileNumber, currentPassword, newPassword } = body;

    // 1. Update basic info if provided
    if (fullName && fullName.trim()) {
      await execute('UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        fullName.trim(),
        user.id,
      ]);
    }

    if (mobileNumber !== undefined) {
      if (mobileNumber && !isValidMobileNumber(mobileNumber)) {
        return NextResponse.json(
          { error: 'Please provide a valid mobile number.' },
          { status: 400 }
        );
      }
      await execute('UPDATE users SET mobile_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        mobileNumber ? mobileNumber.trim() : null,
        user.id,
      ]);
    }

    // 2. Change password if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }

      const currentUserRow = await queryOne<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [user.id]
      );

      if (!currentUserRow || !currentUserRow.password_hash) {
        return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
      }

      const isCurrentValid = bcrypt.compareSync(currentPassword, currentUserRow.password_hash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        newHash,
        user.id,
      ]);
    }

    // Fetch updated user
    const updatedUser = await queryOne<User>(
      'SELECT id, full_name, email, mobile_number, role, status, created_at, updated_at FROM users WHERE id = ?',
      [user.id]
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to retrieve updated profile.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobile_number,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
