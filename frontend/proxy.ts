import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// routes admin can access without login
const PUBLIC_ADMIN_ROUTES = ["/admin/login"];

export function proxy(req: NextRequest) {
  // const { pathname } = req.nextUrl;
  // console.log("this is pathname", pathname);

  // Only run logic for admin routes
  // if (!pathname.startsWith("/admin")) return NextResponse.next();

  // If user goes to login page, always allow
  // if (PUBLIC_ADMIN_ROUTES.includes(pathname)) return NextResponse.next();

  // Read refresh token cookie
  // const refreshToken = req.cookies.get("admin_refresh_token")?.value;

  // If no refresh token → force login
  // if (!refreshToken) {
  //   const redirectUrl = new URL("/admin/login", req.url);
  //   redirectUrl.searchParams.set("redirect", pathname); // optional
  //   return NextResponse.redirect(redirectUrl);
  // }"/admin/:path*",

  // refresh token exists → allow request (client will verify token)
  return NextResponse.next();
}

// export const config = {
//   matcher: ["/holidays"],
// };
