import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { expireIfNeeded } from "@/lib/expireReservation";
import {
  getCachedIdempotentResponse,
  saveIdempotentResponse,
} from "@/lib/idempotency";
import { prisma } from "@/lib/prisma";
import { ReservationIdSchema } from "@/lib/schemas";
import type { ApiErrorResponse, ReservationWithRelations } from "@/lib/types";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: Request,
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

    const idempotencyKey = request.headers.get("Idempotency-Key");
    const cachedResponse = await getCachedIdempotentResponse(idempotencyKey);
    if (cachedResponse) {
      return cachedResponse as NextResponse<
        ReservationWithRelations | ApiErrorResponse
      >;
    }

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

    if (reservation.status !== "PENDING") {
      if (
        reservation.status === "RELEASED" &&
        reservation.expiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "Reservation has expired" },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: "Reservation is not pending" },
        { status: 400 }
      );
    }

    const confirmed = await prisma.$transaction(async (tx) => {
      return tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    await saveIdempotentResponse(idempotencyKey, confirmed, 200);
    return NextResponse.json(confirmed);
  } catch (error) {
    console.error("POST /api/reservations/[id]/confirm failed:", error);
    return NextResponse.json(
      { error: "Failed to confirm reservation" },
      { status: 500 }
    );
  }
}
