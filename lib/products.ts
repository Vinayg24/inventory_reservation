import { prisma } from "@/lib/prisma";
import type { ProductWithInventory } from "@/lib/types";

export async function getProductsWithInventory(): Promise<ProductWithInventory[]> {
  const products = await prisma.product.findMany({
    include: {
      inventory: {
        include: {
          warehouse: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return products.map((product) => ({
    ...product,
    inventory: product.inventory.map((item) => ({
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      totalUnits: item.totalUnits,
      reservedUnits: item.reservedUnits,
      availableUnits: item.totalUnits - item.reservedUnits,
    })),
  }));
}
