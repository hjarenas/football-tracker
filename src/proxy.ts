import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isAdminPath } from "@/lib/auth-utils";

export default auth((req) => {
  if (isAdminPath(req.nextUrl.pathname) && !req.auth) {
    const siteUrl = process.env.NEXTAUTH_URL ?? `http://${req.headers.get("host")}`;
    const loginUrl = new URL("/anmelden", siteUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
