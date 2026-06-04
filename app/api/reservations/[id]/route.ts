import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { ReservationIdSchema } from "@/lib/schemas";
import type { ApiErrorResponse, ReservationWithRelations } from "@/lib/types";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
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

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("GET /api/reservations/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}
