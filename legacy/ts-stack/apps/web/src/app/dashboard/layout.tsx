"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFarmer = pathname.includes("/dashboard/farmer");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <Link href="/" className="font-bold text-xl">
            🌱 LocalRoots
          </Link>
          <nav className="mx-6 flex items-center space-x-4 lg:space-x-6 flex-1">
            {isFarmer ? (
              <>
                <Link
                  href="/dashboard/farmer"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/farmer/farms"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  My Farms
                </Link>
                <Link
                  href="/dashboard/farmer/shares"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  CSA Shares
                </Link>
                <Link
                  href="/dashboard/farmer/subscribers"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Subscribers
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/consumer"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/consumer/farms"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Find Farms
                </Link>
                <Link
                  href="/dashboard/consumer/subscriptions"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  My Subscriptions
                </Link>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <ClerkLoading>
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </ClerkLoading>
            <ClerkLoaded>
              <UserButton afterSignOutUrl="/" />
            </ClerkLoaded>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto py-6 px-4">{children}</main>
    </div>
  );
} 