import { NextResponse } from "next/server";
import { auth } from "./auth";

const protectedPrefixes = ["/coach", "/portal"];

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const user = req.auth?.user;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/coach") && user?.role !== "coach") {
    return NextResponse.redirect(new URL("/portal", req.nextUrl));
  }

  if (pathname.startsWith("/portal") && user?.role === "client" && user.clientStatus === "archived") {
    return NextResponse.redirect(new URL("/inactive", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
