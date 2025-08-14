'use client';

import { Search, MapPin, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  searchQuery?: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  const clearSearch = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url.toString());
    window.location.reload();
  };

  if (searchQuery) {
    return (
      <div className="text-center py-12">
        <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No farms found</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          We couldn't find any farms matching "{searchQuery}". Try adjusting your search terms or browse all available farms.
        </p>
        <div className="space-x-3">
          <Button onClick={clearSearch} variant="outline">
            Clear Search
          </Button>
          <Button onClick={() => window.location.href = '/farms'}>
            Browse All Farms
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium mb-2">Search Tips:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Try searching by city name (e.g., "Brooklyn", "Portland")</li>
            <li>• Search by ZIP code for nearby farms</li>
            <li>• Use farm type keywords (e.g., "organic", "sustainable")</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="relative mb-6">
        <Sprout className="h-16 w-16 mx-auto text-muted-foreground" />
        <MapPin className="h-8 w-8 absolute -top-1 -right-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">No farms available yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        It looks like there aren't any farms in our network yet. Be the first to discover fresh, local produce!
      </p>
      
      <div className="space-y-3">
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
        
        <div className="text-sm text-muted-foreground">
          <p>Are you a farmer? <a href="/dashboard/farmer" className="text-primary hover:underline">Join our network</a></p>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
        <h3 className="font-medium mb-2">Coming Soon:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Local organic farms</li>
          <li>• Weekly CSA share subscriptions</li>
          <li>• Farm-to-table delivery</li>
          <li>• Seasonal produce boxes</li>
        </ul>
      </div>
    </div>
  );
}