import { prisma } from '@/lib/prisma';
import { PoolScoutClient } from '@/app/pool-scout/PoolScoutClient';

export default async function PoolScoutPage({ searchParams }: { searchParams: { poolImportId?: string } }) {
  const poolImportId = searchParams.poolImportId;

  const initialPoolImport = poolImportId
    ? await prisma.poolImport.findUnique({
        where: { id: poolImportId },
        include: {
          opponents: {
            include: {
              opponentLink: {
                select: { fencingTrackerId: true, fencingTrackerUrl: true },
              },
            },
            orderBy: { rowOrder: 'asc' },
          },
        },
      })
    : null;

  return <PoolScoutClient initialPoolImport={initialPoolImport} />;
}
