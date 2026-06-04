import { NextResponse } from "next/server";
import { expireIfNeeded } from "@/lib/expireReservation";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

type CleanupResponse = {
  expired?: number;
  skipped?: boolean;
};

export async function POST(request: Request): Promise<NextResponse<CleanupResponse>> {
  const cleanupSecret = request.headers.get("x-cleanup-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cleanupSecret !== cronSecret) {
    return NextResponse.json({ skipped: true });
  }

  const lastRun = await redis.get("cleanup:last_run");

  if (lastRun) {
    return NextResponse.json({ skipped: true });
  }

  await redis.set("cleanup:last_run", "1", { px: 60000 });

  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  for (const reservation of expiredReservations) {
    await expireIfNeeded(reservation.id);
  }

  return NextResponse.json({ expired: expiredReservations.length });
}
