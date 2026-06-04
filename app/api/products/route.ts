import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiErrorResponse, ProductWithInventory } from "@/lib/types";

export async function GET(): Promise<
  NextResponse<ProductWithInventory[] | ApiErrorResponse>
> {
  try {
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

    const result: ProductWithInventory[] = products.map((product) => ({
      ...product,
      inventory: product.inventory.map((item) => ({
        warehouseId: item.warehouseId,
        warehouse: item.warehouse,
        totalUnits: item.totalUnits,
        reservedUnits: item.reservedUnits,
        availableUnits: item.totalUnits - item.reservedUnits,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
