'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  getStrengthSnapshot,
  logisticProbability,
  MY_FENCING_TRACKER_ID,
  parseFencingTrackerId,
} from '@/lib/fencingTracker';
import { parseRosterInput } from '@/lib/roster';

export async function createPoolImport(input: { ftlPoolLink: string; rosterRaw: string; kValue: number }) {
  const rows = parseRosterInput(input.rosterRaw);

  const created = await prisma.poolImport.create({
    data: {
      ftlPoolLink: input.ftlPoolLink,
      rosterRaw: input.rosterRaw,
      kValue: input.kValue,
      opponents: {
        create: rows.map((row, idx) => ({
          name: row.name,
          club: row.club || null,
          rating: row.rating || null,
          birthYear: row.birth_year ? Number(row.birth_year) || null : null,
          rowOrder: idx,
        })),
      },
    },
  });

  revalidatePath('/pool-scout');
  return created.id;
}

export async function updateOpponentCell(input: {
  opponentRawId: string;
  field: 'name' | 'club' | 'rating' | 'birthYear';
  value: string;
}) {
  const payload: Record<string, unknown> = {};
  if (input.field === 'birthYear') {
    payload.birthYear = input.value ? Number(input.value) || null : null;
  } else {
    payload[input.field] = input.value || null;
  }

  await prisma.opponentRaw.update({ where: { id: input.opponentRawId }, data: payload });
  revalidatePath('/pool-scout');
}

export async function saveOpponentLink(input: { opponentRawId: string; profileInput: string }) {
  const parsed = parseFencingTrackerId(input.profileInput);
  if (!parsed) throw new Error('Invalid FencingTracker profile URL or id');

  await prisma.opponentLink.upsert({
    where: { opponentRawId: input.opponentRawId },
    update: {
      fencingTrackerId: parsed.id,
      fencingTrackerUrl: parsed.url,
      confirmedAt: new Date(),
    },
    create: {
      opponentRawId: input.opponentRawId,
      fencingTrackerId: parsed.id,
      fencingTrackerUrl: parsed.url,
    },
  });

  revalidatePath('/pool-scout');
}

export async function computeProbabilities(poolImportId: string, kValue: number) {
  const [poolImport, me] = await Promise.all([
    prisma.poolImport.findUnique({
      where: { id: poolImportId },
      include: { opponents: { include: { opponentLink: true }, orderBy: { rowOrder: 'asc' } } },
    }),
    getStrengthSnapshot(MY_FENCING_TRACKER_ID),
  ]);

  if (!poolImport) throw new Error('Pool import not found');

  await prisma.poolImport.update({ where: { id: poolImportId }, data: { kValue } });

  const out: Array<{ opponentRawId: string; pPool: number | null; pDe: number | null }> = [];

  for (const opp of poolImport.opponents) {
    if (!opp.opponentLink) {
      out.push({ opponentRawId: opp.id, pPool: null, pDe: null });
      continue;
    }

    const oppStrength = await getStrengthSnapshot(opp.opponentLink.fencingTrackerId);
    const pPool =
      me.poolStrength != null && oppStrength.poolStrength != null
        ? logisticProbability(me.poolStrength, oppStrength.poolStrength, kValue)
        : null;

    const pDe =
      me.deStrength != null && oppStrength.deStrength != null
        ? logisticProbability(me.deStrength, oppStrength.deStrength, kValue)
        : null;

    out.push({ opponentRawId: opp.id, pPool, pDe });
  }

  return {
    me,
    rows: out,
  };
}
