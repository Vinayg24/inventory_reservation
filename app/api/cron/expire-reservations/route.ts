import { NextResponse } from "next/server";
import { expireIfNeeded } from "@/lib/expireReservation";
import { prisma } from "@/lib/prisma";
import type { ApiErrorResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type ExpireResponse = {
  expired: number;
};

export async function GET(
  request: Request
): Promise<NextResponse<ExpireResponse | ApiErrorResponse>> {
  try {
    const authHeader = request.headers.get("Authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET ?? ""}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    console.error("GET /api/cron/expire-reservations failed:", error);
    return NextResponse.json(
      { error: "Failed to expire reservations" },
      { status: 500 }
    );
  }
}
