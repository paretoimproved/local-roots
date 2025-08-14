"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  children?: React.ReactNode
}

export function Avatar({ src, alt = "", fallback, className, children, ...props }: AvatarProps) {
  const [hasError, setHasError] = React.useState(false)
  
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="aspect-square h-full w-full"
          onError={() => setHasError(true)}
        />
      ) : children ? (
        children
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          {fallback ? (
            <span className="text-sm font-medium">{fallback}</span>
          ) : (
            <span className="text-sm font-medium">
              {alt.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function AvatarFallback({ className, children, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center", className)} {...props}>
      {children}
    </div>
  )
} 