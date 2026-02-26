import { NextResponse } from 'next/server';
import { saveOpponentLink } from '@/app/pool-scout/actions';

export async function POST(req: Request) {
  const body = await req.json();
  await saveOpponentLink(body);
  return NextResponse.json({ ok: true });
}
