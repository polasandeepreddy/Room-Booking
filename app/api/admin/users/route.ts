import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser, isValidMobileNumber } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { User, UserRole, UserStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId');

    // If specific userId requested, return user details + their booking history
    if (userId) {
      const targetUser = await queryOne<any>(
        'SELECT id, full_name, email, mobile_number, role, status, created_at, updated_at FROM users WHERE id = ?',
        [Number(userId)]
      );

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      const userBookings = await query<any>(
        `
          SELECT b.*, f.flat_name
          FROM bookings b
          JOIN flats f ON b.flat_id = f.id
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC
        `,
        [targetUser.id]
      );

      const enrichedBookings = await Promise.all(
        userBookings.map(async (b) => {
          const rooms = await query<any>(
            `
            SELECT r.id, r.room_name, r.room_type
            FROM booking_rooms br
            JOIN rooms r ON br.room_id = r.id
            WHERE br.booking_id = ?
          `,
            [b.id]
          );

          return {
            ...b,
            rooms,
            rooms_display:
              rooms.length === 2 ? 'Both Rooms (Room 1 & Room 2)' : rooms.map((r) => r.room_name).join(', '),
          };
        })
      );

      return NextResponse.json({
        success: true,
        user: targetUser,
        bookings: enrichedBookings,
      });
    }

    // List all users with booking counts
    let sqlQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.mobile_number,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) as booking_count
      FROM users u
      WHERE 1=1
    `;
    let params: any[] = [];

    if (search.trim()) {
      sqlQuery += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.mobile_number LIKE ?)`;
      const p = `%${search.trim()}%`;
      params.push(p, p, p);
    }

    sqlQuery += ` ORDER BY u.created_at DESC`;

    const users = await query(sqlQuery, params);

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch users.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Admin creates a new user account
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, mobileNumber, password, role = 'user', status = 'active' } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (mobileNumber && !isValidMobileNumber(mobileNumber.trim())) {
      return NextResponse.json({ error: 'Please provide a valid mobile number (minimum 8 digits).' }, { status: 400 });
    }

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role must be either user or admin.' }, { status: 400 });
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status must be active or inactive.' }, { status: 400 });
    }

    // Check if email already exists
    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await execute(
      `
      INSERT INTO users (full_name, email, password_hash, mobile_number, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        fullName.trim(),
        cleanEmail,
        passwordHash,
        mobileNumber ? mobileNumber.trim() : null,
        role as UserRole,
        status as UserStatus,
      ]
    );

    const newUser = await queryOne<User>(
      'SELECT id, full_name, email, mobile_number, role, status, created_at, updated_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({
      success: true,
      message: `User ${newUser?.full_name} created successfully as ${role}.`,
      user: newUser,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create user.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH / PUT: Admin updates an existing user account (role, status, profile details, or password)
 */
export async function PATCH(req: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, status, fullName, mobileNumber, password } = body;

    const id = Number(userId);
    if (!id) {
      return NextResponse.json({ error: 'Valid User ID is required.' }, { status: 400 });
    }

    const targetUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Safety Guard: Admin cannot demote or deactivate their own active account
    if (id === adminUser.id) {
      if (role && role !== 'admin') {
        return NextResponse.json({ error: 'You cannot remove your own admin role.' }, { status: 400 });
      }
      if (status && status !== 'active') {
        return NextResponse.json({ error: 'You cannot deactivate your own admin account.' }, { status: 400 });
      }
    }

    let updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    let values: any[] = [];

    if (role) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Role must be user or admin.' }, { status: 400 });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Status must be active or inactive.' }, { status: 400 });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return NextResponse.json({ error: 'Full name cannot be empty.' }, { status: 400 });
      }
      updates.push('full_name = ?');
      values.push(fullName.trim());
    }

    if (mobileNumber !== undefined) {
      if (mobileNumber && !isValidMobileNumber(mobileNumber.trim())) {
        return NextResponse.json({ error: 'Invalid mobile number.' }, { status: 400 });
      }
      updates.push('mobile_number = ?');
      values.push(mobileNumber ? mobileNumber.trim() : null);
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }
      const hash = bcrypt.hashSync(password, 10);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    values.push(id);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const updatedUser = await queryOne<User>(
      'SELECT id, full_name, email, mobile_number, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully.',
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update user.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Admin deletes a user account
 */
export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id') || searchParams.get('userId');
    const id = Number(userId);

    if (!id) {
      return NextResponse.json({ error: 'Valid User ID is required.' }, { status: 400 });
    }

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    const targetUser = await queryOne<User>('SELECT id FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await execute('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete user.' },
      { status: 500 }
    );
  }
}
