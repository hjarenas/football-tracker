import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPath, isAuthenticatedSession } from "@/lib/auth-utils";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (isAdminPath(request.nextUrl.pathname) && !isAuthenticatedSession(session)) {
    const siteUrl = process.env.NEXTAUTH_URL ?? `http://${request.headers.get("host")}`;
    const loginUrl = new URL("/anmelden", siteUrl);
    loginUrl.searchParams.set(
      "callbackUrl",
      new URL(request.nextUrl.pathname + request.nextUrl.search, siteUrl).href
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
