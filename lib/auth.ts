import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { User, UserRole } from './types';
import { queryOne } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'flat_room_booking_super_secret_jwt_key_2026_modern_safe'
);

export const AUTH_COOKIE_NAME = 'auth_token';

export interface TokenPayload {
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
  exp?: number;
}

/**
 * Sign and generate JWT token
 */
export async function signToken(payload: Omit<TokenPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token string
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get current session user from Next.js server headers/cookies
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) return null;

    const user = await queryOne<User>(
      "SELECT id, full_name, email, mobile_number, role, status, created_at, updated_at FROM users WHERE id = ? AND status = 'active'",
      [payload.userId]
    );

    return user || null;
  } catch (err) {
    return null;
  }
}

/**
 * Get token payload from API Request
 */
export async function getUserFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value || req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    return await verifyToken(token);
  } catch (err) {
    return null;
  }
}

/**
 * Validate mobile number (supports international and local 10-digit formats)
 */
export function isValidMobileNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
}
