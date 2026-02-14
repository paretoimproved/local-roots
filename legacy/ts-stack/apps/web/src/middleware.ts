import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporarily disable Clerk middleware to allow deployment without environment variables
// This enables functional testing of Sprint 1 features before authentication integration
export default function middleware(request: NextRequest) {
  // Allow all requests to pass through during Sprint 1 testing phase
  // TODO: Re-enable Clerk authentication middleware after environment variables are configured
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 