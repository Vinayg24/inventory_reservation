import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiErrorResponse } from "@/lib/types";
import type { Warehouse } from "@prisma/client";

export async function GET(): Promise<
  NextResponse<Warehouse[] | ApiErrorResponse>
> {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("GET /api/warehouses failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}
