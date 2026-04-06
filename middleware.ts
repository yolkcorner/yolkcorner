// global middleware - protect admin area
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_PATH = '/admin';
const ADMIN_LOGIN_PATH = '/admin/login';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

type JwtUser = {
  role?: string;
};

async function verifyEdgeToken(token: string): Promise<JwtUser | null> {
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as JwtUser;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminArea = pathname.startsWith(ADMIN_PATH);
  const isAdminLogin = pathname === ADMIN_LOGIN_PATH;
  const isAdminApi = pathname.startsWith('/api/admin');

  // only guard admin pages and admin api routes
  if ((isAdminArea && !isAdminLogin) || isAdminApi) {
    const token = req.cookies.get('token')?.value || '';
    const user = await verifyEdgeToken(token);
    if (!user || user.role !== 'admin') {
      const loginUrl = new URL('/admin/login', req.url);
      // redirect to login page
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
