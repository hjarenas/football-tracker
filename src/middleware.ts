import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPath, isAuthenticatedSession } from "@/lib/auth-utils";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (isAdminPath(request.nextUrl.pathname) && !isAuthenticatedSession(session)) {
    const loginUrl = new URL("/anmelden", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
