"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { MainNav } from "./main-nav"
import { UserNav } from "./user-nav"
import { Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  href: string
}

export function Header() {
  const pathname = usePathname()
  const showFarmerNav = pathname?.includes("/dashboard/farmer")
  const showConsumerNav = pathname?.includes("/dashboard/consumer") 
  const isHomepage = pathname === "/"
  
  const farmerNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard/farmer",
    },
    {
      title: "My Farms",
      href: "/dashboard/farmer/farms",
    },
    {
      title: "CSA Shares",
      href: "/dashboard/farmer/shares",
    },
    {
      title: "Subscribers",
      href: "/dashboard/farmer/subscribers",
    },
  ]
  
  const consumerNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard/consumer",
    },
    {
      title: "Find Farms",
      href: "/dashboard/consumer/farms",
    },
    {
      title: "My Subscriptions",
      href: "/dashboard/consumer/subscriptions",
    },
  ]
  
  // Empty main nav - no links needed
  const mainNavItems: NavItem[] = []
  
  let navItems = mainNavItems
  
  if (showFarmerNav) {
    navItems = farmerNavItems
  } else if (showConsumerNav) {
    navItems = consumerNavItems
  }

  // Show search bar everywhere except farmer dashboard and non-main pages
  const showSearch = !showFarmerNav && isHomepage

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="container flex h-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/local-roots-logo.png"
                width={96}
                height={96}
                alt="LocalRoots Logo"
                className="h-12 w-auto rounded-full"
                priority
                quality={100}
              />
            </Link>
            
            {!showFarmerNav && !showConsumerNav && (
              <div className="hidden md:flex">
                <MainNav items={navItems} />
              </div>
            )}
            {(showFarmerNav || showConsumerNav) && (
              <MainNav items={navItems} />
            )}
          </div>
          
            {!showFarmerNav && !showConsumerNav && showSearch && (
              <div className="hidden md:flex flex-1 max-w-md mx-auto">
                <div className="flex w-full items-center rounded-full border shadow-sm overflow-hidden">
                  <div className="flex items-center p-2 flex-1 w-full">
                    <div className="w-full flex items-center">
                      <input placeholder="Where are you located?" className="outline-none text-sm w-full px-2" />
                      <Button variant="ghost" size="icon" className="rounded-full mr-1">
                        <Search className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          
          <div className="flex items-center">
            <Link href="/auth" className="flex items-center border rounded-full p-1 shadow-sm hover:shadow-md transition-all" aria-label="Sign in or sign up">
              <Menu className="h-5 w-5 mx-2" />
              <UserNav />
            </Link>
          </div>
        </div>
        
        {/* Mobile search bar */}
        {showSearch && (
          <div className="md:hidden w-full mt-3">
            <div className="flex items-center rounded-full shadow-lg border overflow-hidden bg-white">
              <div className="flex items-center p-2 flex-1 w-full">
                <div className="w-full flex items-center">
                  <input placeholder="Where are you located?" className="outline-none text-sm w-full px-2" />
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Search className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 