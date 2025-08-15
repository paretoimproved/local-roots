'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { getFarms } from '@/api/farms.api';
import { FarmCard } from './FarmCard';
import { FarmCardSkeleton } from './FarmCardSkeleton';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';

export function FarmsList() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['farms', { search: searchQuery }],
    queryFn: ({ pageParam }) => getFarms({ 
      cursor: pageParam, 
      limit: 20,
      search: searchQuery || undefined 
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    retry: (failureCount, error: any) => {
      // Only retry on network errors, not client errors
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Auto-fetch next page when scrolling near bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get all farms from all pages
  const farms = data?.pages.flatMap(page => page.data) ?? [];
  const totalFarms = farms.length;

  if (isError) {
    return (
      <ErrorBoundary 
        error={error} 
        reset={() => window.location.reload()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <FarmCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (totalFarms === 0) {
    return <EmptyState searchQuery={searchQuery} />;
  }

  return (
    <div className="space-y-8">
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {searchQuery ? (
          <span>Found {totalFarms} farms matching "{searchQuery}"</span>
        ) : (
          <span>Showing {totalFarms} local farms</span>
        )}
      </div>

      {/* Farms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.map((farm, index) => (
          <FarmCard 
            key={farm.id} 
            farm={farm}
            priority={index < 6} // Prioritize loading first 6 images
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {hasNextPage && (
        <div 
          ref={ref}
          className="flex justify-center py-4"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading more farms...</span>
            </div>
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="text-sm text-primary hover:underline"
            >
              Load more farms
            </button>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && totalFarms > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            You've seen all {totalFarms} farms. 
            {searchQuery && (
              <span>
                {' '}Try adjusting your search to discover more.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}