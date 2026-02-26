import { prisma } from '@/lib/prisma';

export type ParsedStrength = {
  poolStrength: number | null;
  deStrength: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  rawPayload: string;
  sourceUrl: string;
};

export const MY_FENCING_TRACKER_ID = '100268345';
const TTL_MS = 24 * 60 * 60 * 1000;

export function parseFencingTrackerId(input: string): { id: string; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return {
      id: trimmed,
      url: `https://fencingtracker.com/profile/${trimmed}/strength`,
    };
  }

  const match = trimmed.match(/profile\/(\d+)/i) ?? trimmed.match(/\/(\d+)(?:\/)?$/);
  if (!match) return null;

  const id = match[1];
  return {
    id,
    url: `https://fencingtracker.com/profile/${id}/strength`,
  };
}

function pullNumber(raw: string, label: string): number | null {
  const patterns = [
    new RegExp(`"${label}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
    new RegExp(`${label}\\s*[=:]\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
    new RegExp(`${label.replace('_', ' ')}\\s*[=:]\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
  ];

  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (m) return Number(m[1]);
  }
  return null;
}

function parseStrengthHtml(raw: string, sourceUrl: string): ParsedStrength {
  return {
    poolStrength: pullNumber(raw, 'pool_strength'),
    deStrength: pullNumber(raw, 'de_strength'),
    confidenceLow: pullNumber(raw, 'confidence_low'),
    confidenceHigh: pullNumber(raw, 'confidence_high'),
    rawPayload: raw,
    sourceUrl,
  };
}

export async function getStrengthSnapshot(id: string): Promise<ParsedStrength> {
  const latest = await prisma.strengthSnapshot.findFirst({
    where: { fencingTrackerId: id },
    orderBy: { fetchedAt: 'desc' },
  });

  if (latest && Date.now() - latest.fetchedAt.getTime() < TTL_MS) {
    return {
      poolStrength: latest.poolStrength,
      deStrength: latest.deStrength,
      confidenceLow: latest.confidenceLow,
      confidenceHigh: latest.confidenceHigh,
      rawPayload: latest.rawPayload,
      sourceUrl: latest.sourceUrl,
    };
  }

  const targetUrl = `https://fencingtracker.com/profile/${id}/strength`;
  const response = await fetch(targetUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch FencingTracker page for ${id}: ${response.status}`);
  }

  const html = await response.text();
  const parsed = parseStrengthHtml(html, targetUrl);

  await prisma.strengthSnapshot.create({
    data: {
      fencingTrackerId: id,
      sourceUrl: parsed.sourceUrl,
      poolStrength: parsed.poolStrength,
      deStrength: parsed.deStrength,
      confidenceLow: parsed.confidenceLow,
      confidenceHigh: parsed.confidenceHigh,
      rawPayload: parsed.rawPayload,
    },
  });

  return parsed;
}

export function logisticProbability(mine: number, theirs: number, k: number): number {
  return 1 / (1 + Math.exp(-((mine - theirs) / k)));
}
