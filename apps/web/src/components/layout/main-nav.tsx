"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface MainNavProps {
  items?: {
    title: string
    href: string
  }[]
}

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname()
  const isMainNav = !pathname?.includes("/dashboard")

  return (
    <div className="flex gap-2">
      {!isMainNav && (
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image 
            src="/images/local-roots-logo.png" 
            alt="LocalRoots Logo" 
            width={32} 
            height={32} 
            className="rounded-full"
          />
          <span className="hidden font-bold sm:inline-block text-farm-green-dark">
            LocalRoots
          </span>
        </Link>
      )}
      
      {items?.length ? (
        <nav className="flex items-center gap-1">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm transition-colors hover:text-farm-green",
                isMainNav ? "font-medium" : "",
                pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
                  ? isMainNav 
                    ? "font-medium text-farm-green border-b-2 border-farm-green" 
                    : "text-farm-green"
                  : "text-gray-600"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  )
} 