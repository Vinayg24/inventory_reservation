import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { expireIfNeeded } from "@/lib/expireReservation";
import { prisma } from "@/lib/prisma";
import { ReservationIdSchema } from "@/lib/schemas";
import type { ApiErrorResponse, ReservationWithRelations } from "@/lib/types";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<NextResponse<ReservationWithRelations | ApiErrorResponse>> {
  try {
    let params;

    try {
      params = ReservationIdSchema.parse(context.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.errors.map((issue) => issue.message).join(", ") },
          { status: 400 }
        );
      }
      throw error;
    }

    await expireIfNeeded(params.id);

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.status === "RELEASED" || reservation.status === "CONFIRMED") {
      return NextResponse.json(
        { error: `Cannot release a ${reservation.status} reservation` },
        { status: 400 }
      );
    }

    const released = await prisma.$transaction(async (tx) => {
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

      return tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "RELEASED" },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    return NextResponse.json(released);
  } catch (error) {
    console.error("POST /api/reservations/[id]/release failed:", error);
    return NextResponse.json(
      { error: "Failed to release reservation" },
      { status: 500 }
    );
  }
}
