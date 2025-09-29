'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { FarmsList } from '@/components/farms/FarmsList';
import { SearchBox } from '@/components/farms/SearchBox';
import { FarmDetailDrawer } from '@/components/farms/FarmDetailDrawer';
import { FarmCardSkeleton } from '@/components/farms/FarmCardSkeleton';

export default function FarmsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Discover Local Farms
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find fresh, seasonal produce from local farmers in your area through Community Supported Agriculture
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <SearchBox />
        </div>

        {/* Farms List */}
        <Suspense
          fallback={(
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <FarmCardSkeleton key={index} />
              ))}
            </div>
          )}
        >
          <FarmsList />
        </Suspense>
      </div>
      
      {/* Farm Detail Drawer */}
      <FarmDetailDrawer />
    </div>
  );
}
