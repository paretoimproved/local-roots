'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

const SEARCH_HISTORY_KEY = 'local-roots-search-history';
const MAX_HISTORY_ITEMS = 5;

/**
 * SearchBox component for LOC-7: Location-Based Search
 * Implements real-time search with debouncing, URL state persistence,
 * search history, and mobile optimization.
 */
export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search input (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Update URL when debounced search term changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearchTerm.trim()) {
      params.set('search', debouncedSearchTerm.trim());
      setIsSearching(true);
    } else {
      params.delete('search');
      setIsSearching(false);
    }
    
    // Only update if params actually changed
    const newParamsString = params.toString();
    const currentParamsString = searchParams.toString();
    
    if (newParamsString !== currentParamsString) {
      const newUrl = `/farms${newParamsString ? `?${newParamsString}` : ''}`;
      router.push(newUrl, { scroll: false });
      
      // Reset searching state after a delay
      if (debouncedSearchTerm.trim()) {
        setTimeout(() => setIsSearching(false), 1000);
      }
    }
  }, [debouncedSearchTerm, router, searchParams]);

  // Validate search input
  const validateSearchTerm = (term: string): boolean => {
    // Allow letters, numbers, spaces, hyphens, and common punctuation
    const validPattern = /^[a-zA-Z0-9\s\-,.#]+$/;
    return validPattern.test(term) || term === '';
  };

  // Save search term to history when user submits
  const saveToHistory = useCallback((term: string) => {
    if (!term.trim() || term.length < 2) return;
    
    const normalizedTerm = term.trim().toLowerCase();
    const updatedHistory = [
      normalizedTerm,
      ...searchHistory.filter(item => item !== normalizedTerm)
    ].slice(0, MAX_HISTORY_ITEMS);
    
    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  }, [searchHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      saveToHistory(searchTerm);
      setShowHistory(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowHistory(false);
  };

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            type="search"
            inputMode="search"
            placeholder="Search by city, ZIP code, or farm name..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              if (validateSearchTerm(value)) {
                setSearchTerm(value);
              }
            }}
            onFocus={() => setShowHistory(true)}
            className="pl-10 pr-12 py-3"
            autoComplete="off"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </form>

      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Recent searches
              </span>
              <button
                onClick={clearHistory}
                className="hover:text-foreground"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-1">
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(term)}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded capitalize"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close history */}
      {showHistory && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}