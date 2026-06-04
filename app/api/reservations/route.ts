import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCachedIdempotentResponse,
  saveIdempotentResponse,
} from "@/lib/idempotency";
import { acquireLock, releaseLock } from "@/lib/lock";
import { ReserveSchema } from "@/lib/schemas";
import type { ApiErrorResponse, InventoryRow, ReservationWithRelations } from "@/lib/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function POST(
  request: Request
): Promise<NextResponse<ReservationWithRelations | ApiErrorResponse>> {
  try {
    const body: unknown = await request.json();
    let input;

    try {
      input = ReserveSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.errors.map((issue) => issue.message).join(", ") },
          { status: 400 }
        );
      }
      throw error;
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    const cachedResponse = await getCachedIdempotentResponse(idempotencyKey);
    if (cachedResponse) {
      return cachedResponse as NextResponse<
        ReservationWithRelations | ApiErrorResponse
      >;
    }

    const { productId, warehouseId, quantity } = input;
    const lockKey = `lock:inventory:${productId}:${warehouseId}`;

    let lockAcquired = await acquireLock(lockKey, 5000);
    if (!lockAcquired) {
      await sleep(100);
      lockAcquired = await acquireLock(lockKey, 5000);
    }

    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Could not acquire lock, try again" },
        { status: 409 }
      );
    }

    try {
      const reservation = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<InventoryRow[]>`
          SELECT * FROM "Inventory"
          WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          FOR UPDATE`;

        const inv = rows[0];
        if (!inv) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        const available = inv.totalUnits - inv.reservedUnits;
        if (available < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
          data: {
            reservedUnits: {
              increment: quantity,
            },
          },
        });

        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "PENDING",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
          include: {
            product: true,
            warehouse: true,
          },
        });
      });

      await saveIdempotentResponse(idempotencyKey, reservation, 201);
      return NextResponse.json(reservation, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INSUFFICIENT_STOCK") {
          return NextResponse.json(
            { error: "Insufficient stock" },
            { status: 409 }
          );
        }

        if (error.message === "INVENTORY_NOT_FOUND") {
          return NextResponse.json(
            { error: "Inventory not found" },
            { status: 404 }
          );
        }
      }

      throw error;
    } finally {
      await releaseLock(lockKey);
    }
  } catch (error) {
    console.error("POST /api/reservations failed:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
