'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const categoryOptions = [
  { label: 'All categories', value: 'all' },
  { label: 'Vegetables', value: 'vegetables' },
  { label: 'Fruit', value: 'fruit' },
  { label: 'Dairy', value: 'dairy' },
  { label: 'Herbs', value: 'herbs' },
  { label: 'Flowers', value: 'flowers' },
  { label: 'Meat', value: 'meat' },
  { label: 'Honey', value: 'honey' },
  { label: 'Seafood', value: 'seafood' },
];

const priceOptions = [
  { label: 'All price points', value: 'all' },
  { label: 'Under $30/week', value: 'under-30' },
  { label: '$30 - $40/week', value: '30-40' },
  { label: 'Over $40/week', value: '40-plus' },
];

const deliveryOptions = [
  { label: 'Pickup or delivery', value: 'all' },
  { label: 'Delivery available', value: 'delivery' },
  { label: 'Pickup only', value: 'pickup' },
];

const ratingOptions = [
  { label: 'All ratings', value: 'all' },
  { label: '4.0 ★ & up', value: '4' },
  { label: '4.5 ★ & up', value: '4.5' },
];

const sortOptions = [
  { label: 'Sort by distance', value: 'distance' },
  { label: 'Sort by rating', value: 'rating' },
  { label: 'Sort by price', value: 'price' },
  { label: 'Sort A → Z', value: 'name' },
];

const FILTER_KEYS = ['category', 'price', 'delivery', 'rating', 'sort'] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

export function FarmsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentValues = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries());
    return {
      category: params.category ?? 'all',
      price: params.price ?? 'all',
      delivery: params.delivery ?? 'all',
      rating: params.rating ?? 'all',
      sort: params.sort ?? 'distance',
    };
  }, [searchParams]);

  const updateParam = (key: FilterKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'all' || (key === 'sort' && value === 'distance')) {
      if (key === 'sort') {
        params.delete(key);
      } else {
        params.delete(key);
      }
    } else {
      params.set(key, value);
    }

    // Reset pagination cursor when filters change
    params.delete('cursor');

    const nextUrl = `/farms${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(nextUrl, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    params.delete('cursor');
    const nextUrl = `/farms${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(nextUrl, { scroll: false });
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>

        <Select
          value={currentValues.category}
          onValueChange={(value) => updateParam('category', value)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentValues.price}
          onValueChange={(value) => updateParam('price', value)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            {priceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentValues.delivery}
          onValueChange={(value) => updateParam('delivery', value)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Delivery" />
          </SelectTrigger>
          <SelectContent>
            {deliveryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentValues.rating}
          onValueChange={(value) => updateParam('rating', value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            {ratingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentValues.sort}
          onValueChange={(value) => updateParam('sort', value)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </Button>
      </div>
    </div>
  );
}
