import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// routes admin can access without login
const PUBLIC_ADMIN_ROUTES = ["/admin/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const goneUrls = [
    "/holidays/customised-tour-packages/[object%20Object]/qutub-minar",
    "/holidays/customised-tour-packages/[object%20Object]/jama-masjid-chandni-chowk",
    "/holidays/customised-tour-packages/[object%20Object]/delhi-tour-packages",
    "/holidays/customised-tour-packages/[object%20Object]/raj-ghat",
    "/holidays/customised-tour-packages/[object%20Object]/red-fort",
  ];

  if (goneUrls.includes(pathname)) {
    return new NextResponse(null, { status: 410 });
  }

  // Only run logic for admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // If user goes to login page, always allow
  if (PUBLIC_ADMIN_ROUTES.includes(pathname)) return NextResponse.next();

  // Read refresh token cookie
  const refreshToken = req.cookies.get("admin_refresh_token")?.value;

  // If no refresh token → force login
  if (!refreshToken) {
    const redirectUrl = new URL("/admin/login", req.url);
    redirectUrl.searchParams.set("redirect", pathname); // optional
    return NextResponse.redirect(redirectUrl);
  }

  // refresh token exists → allow request (client will verify token)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/holidays/customised-tour-packages/:path*"],
};
