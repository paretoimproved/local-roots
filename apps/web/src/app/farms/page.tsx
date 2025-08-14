'use client';

import { FarmsList } from '@/components/farms/FarmsList';
import { SearchBox } from '@/components/farms/SearchBox';
import { FarmDetailDrawer } from '@/components/farms/FarmDetailDrawer';

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
        <FarmsList />
      </div>
      
      {/* Farm Detail Drawer */}
      <FarmDetailDrawer />
    </div>
  );
}