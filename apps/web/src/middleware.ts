import { authMiddleware, redirectToSignIn } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/auth(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/select-user-type(.*)",
    "/api(.*)",
    "/health",
    "/verification(.*)",
    "/forgot-password(.*)",
    "/reset-password(.*)",
  ],
  afterAuth(auth, req, evt) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // Handle clerk's internal routes
    if (req.nextUrl.pathname.includes("/sign-in/factor-one")) {
      return NextResponse.next();
    }

    // If the user is logged in and trying to access auth, sign-in or sign-up pages,
    // redirect them based on their user type or to select user type if not set
    if (auth.userId && 
        (req.nextUrl.pathname.startsWith('/auth') ||
         req.nextUrl.pathname.startsWith('/sign-in') || 
         req.nextUrl.pathname.startsWith('/sign-up'))) {
      
      const userType = auth.user?.unsafeMetadata?.userType as string | undefined;
      
      // Skip redirect logic for verification-related paths
      if (req.nextUrl.pathname.includes('verify-email')) {
        return NextResponse.next();
      }
      
      // If user hasn't selected a type yet, redirect to selection page
      if (!userType) {
        return NextResponse.redirect(new URL('/select-user-type', req.url));
      }
      
      // If user has a type, redirect to appropriate dashboard
      if (userType === 'farmer') {
        return NextResponse.redirect(new URL('/dashboard/farmer', req.url));
      } else if (userType === 'consumer') {
        return NextResponse.redirect(new URL('/dashboard/consumer', req.url));
      }
    }

    // If the user is logged in but hasn't selected a user type yet, 
    // and they're trying to access a dashboard, redirect to selection page
    if (auth.userId && 
        req.nextUrl.pathname.startsWith('/dashboard') && 
        !auth.user?.unsafeMetadata?.userType) {
      return NextResponse.redirect(new URL('/select-user-type', req.url));
    }
    
    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 