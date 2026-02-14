"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "../ui/avatar"

// Temporarily disable Clerk integration for Sprint 1 testing
export function UserNav() {
  const router = useRouter()
  
  // Show generic user avatar that navigates to auth during testing phase
  return (
    <div className="flex items-center">
      <Avatar 
        className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={() => router.push("/auth")}
      >
        <AvatarFallback className="bg-gray-100 text-gray-600 border border-gray-200">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </AvatarFallback>
      </Avatar>
    </div>
  )
} 