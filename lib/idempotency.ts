import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getCachedIdempotentResponse(
  idempotencyKey: string | null
): Promise<NextResponse | null> {
  if (!idempotencyKey) {
    return null;
  }

  const cached = await prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey },
  });

  if (!cached) {
    return null;
  }

  const { NextResponse: NextResponseClass } = await import("next/server");
  return NextResponseClass.json(cached.response, { status: cached.statusCode });
}

export async function saveIdempotentResponse(
  idempotencyKey: string | null,
  response: unknown,
  statusCode: number
): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  await prisma.idempotencyKey.create({
    data: {
      key: idempotencyKey,
      response: response as object,
      statusCode,
    },
  });
}
