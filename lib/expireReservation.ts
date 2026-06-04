import { prisma } from "@/lib/prisma";

export async function expireIfNeeded(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) return null;

  if (
    reservation.status === "PENDING" &&
    reservation.expiresAt < new Date()
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED" },
      });
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });
    });
    return { ...reservation, status: "RELEASED" as const };
  }

  return reservation;
}
