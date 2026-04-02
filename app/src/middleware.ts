import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...") &&
  !!process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes("...");

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Tenant-facing public routes
  "/apply(.*)",
  "/maintenance/new(.*)",
  "/api/maintenance(.*)",
  "/pay(.*)",
  // Webhooks
  "/api/webhooks(.*)",
  // Landlord APIs handle auth in-route and should return JSON errors
  "/api/properties(.*)",
  "/api/tenants(.*)",
  // Automation endpoints (n8n, etc. authenticate via headers)
  "/api/automations/lease-candidates(.*)",
  "/api/automations/scheduler/landlords(.*)",
  // Managed integrations are authenticated in route handlers and require tenant headers
  "/api/managed(.*)",
  "/api/managed-integrations(.*)",
]);

export default clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

