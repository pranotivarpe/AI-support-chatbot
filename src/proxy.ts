import { NextResponse, type NextRequest } from "next/server";

// Cheap optimistic check: bounce signed-out visitors away from the dashboard.
// Real verification happens in requireUser() on every dashboard request.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sp_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
