import { NextResponse } from "next/server";
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

    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    for (const reservation of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "RELEASED" },
        });

        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            reservedUnits: {
              decrement: reservation.quantity,
            },
          },
        });
      });
    }

    return NextResponse.json({ expired: expired.length });
  } catch (error) {
    console.error("GET /api/cron/expire-reservations failed:", error);
    return NextResponse.json(
      { error: "Failed to expire reservations" },
      { status: 500 }
    );
  }
}
