import { NextResponse } from 'next/server';
import { computeProbabilities } from '@/app/pool-scout/actions';

export async function POST(req: Request) {
  const body = await req.json();
  const data = await computeProbabilities(body.poolImportId, Number(body.kValue) || 300);
  return NextResponse.json(data);
}
