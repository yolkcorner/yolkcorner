import { NextRequest, NextResponse } from 'next/server';
import { findUserByIdentifier, comparePassword, createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, identifier, password } = body;
    const loginIdentifier =
      typeof identifier === 'string'
        ? identifier
        : typeof username === 'string'
          ? username
          : email;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { code: 'missing_credentials', error: 'missing credentials' },
        { status: 400 },
      );
    }

    const user = findUserByIdentifier(loginIdentifier);
    if (!user || !comparePassword(password, user.passwordHash)) {
      return NextResponse.json(
        { code: 'invalid_credentials', error: 'invalid credentials' },
        { status: 401 },
      );
    }

    const token = createToken({ email: user.email, role: user.role });
    const res = NextResponse.json({ ok: true });
    res.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'internal server error' },
      { status: 500 },
    );
  }
}
