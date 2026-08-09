import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const res = NextResponse.redirect(new URL('/signup', req.url));
  res.cookies.set('referral_code', params.code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return res;
}