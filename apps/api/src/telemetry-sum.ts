import { prisma } from "@satu-atap/db";

const DELTA_KEYS = new Set(["energy_kwh_delta", "volume_liters_delta"]);

/**
 * Sum a counter-delta over [from, to) using hourly aggregates (updated on ingest).
 * Falls back to a SQL JSON sum only when no aggregate rows exist for the window.
 */
export async function sumDeltaMetric(
  homeId: string,
  deltaKey: string,
  from: Date,
  to: Date
): Promise<number> {
  if (!DELTA_KEYS.has(deltaKey)) {
    throw new Error(`Unsupported delta metric: ${deltaKey}`);
  }

  const agg = await prisma.telemetryAggregate.aggregate({
    _sum: { sum: true },
    _count: true,
    where: {
      homeId,
      metric: deltaKey,
      period: "hour",
      periodStart: { gte: from, lt: to },
    },
  });
  if (agg._count > 0) {
    return Number(agg._sum.sum ?? 0);
  }

  const rows = await prisma.$queryRaw<Array<{ sum: number | string | null }>>`
    SELECT COALESCE(SUM((metrics->>${deltaKey})::double precision), 0) AS sum
    FROM "TelemetryReading"
    WHERE "homeId" = ${homeId}
      AND "recordedAt" >= ${from}
      AND "recordedAt" < ${to}
  `;
  return Number(rows[0]?.sum ?? 0);
}
