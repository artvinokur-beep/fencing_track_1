import { NextResponse } from 'next/server';
import { createPoolImport } from '@/app/pool-scout/actions';

export async function POST(req: Request) {
  const body = await req.json();
  const id = await createPoolImport({
    ftlPoolLink: body.ftlPoolLink ?? '',
    rosterRaw: body.rosterRaw ?? '',
    kValue: Number(body.kValue) || 300,
  });
  return NextResponse.json({ id });
}
