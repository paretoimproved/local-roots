'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function FarmCardSkeleton() {
  return (
    <Card className="animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-muted rounded-t-lg" />
      
      <CardHeader className="pb-2">
        <div className="space-y-2">
          {/* Farm name skeleton */}
          <div className="h-5 bg-muted rounded w-3/4" />
          
          {/* Location skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-4/5" />
          <div className="h-4 bg-muted rounded w-3/5" />
        </div>
        
        {/* Footer skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      </CardContent>
    </Card>
  );
}