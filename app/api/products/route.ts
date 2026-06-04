import { NextResponse } from "next/server";
import { getProductsWithInventory } from "@/lib/products";
import type { ApiErrorResponse, ProductWithInventory } from "@/lib/types";

export async function GET(): Promise<
  NextResponse<ProductWithInventory[] | ApiErrorResponse>
> {
  try {
    const result = await getProductsWithInventory();
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
