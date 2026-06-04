import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    fetch(`${request.nextUrl.origin}/api/cleanup`, {
      method: "POST",
      headers: { "x-cleanup-secret": cronSecret },
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
