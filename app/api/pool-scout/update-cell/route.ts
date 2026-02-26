import { NextResponse } from 'next/server';
import { updateOpponentCell } from '@/app/pool-scout/actions';

export async function POST(req: Request) {
  const body = await req.json();
  await updateOpponentCell(body);
  return NextResponse.json({ ok: true });
}
