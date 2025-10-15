'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SEARCH_HISTORY_KEY = 'local-roots-search-history';
const MAX_HISTORY_ITEMS = 5;

const STATE_FULL_TO_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

const STATE_ABBR_TO_FULL = Object.entries(STATE_FULL_TO_ABBR).reduce<Record<string, string>>(
  (acc, [full, abbr]) => {
    const titleCased = full
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    acc[abbr] = titleCased;
    return acc;
  },
  {}
);

const validateSearchTerm = (term: string) => {
  const validPattern = /^[a-zA-Z0-9\s\-,.#]+$/;
  return validPattern.test(term) || term === '';
};

const normalizeStateNames = (term: string) => {
  let normalized = term;
  Object.entries(STATE_FULL_TO_ABBR).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    normalized = normalized.replace(regex, abbr);
  });
  return normalized;
};

const displayStateTerm = (value: string) => {
  if (!value) return '';
  const upper = value.toUpperCase();
  return STATE_ABBR_TO_FULL[upper] ?? value;
};

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => displayStateTerm(searchParams.get('search') || ''));
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return;
    try {
      setSearchHistory(JSON.parse(stored));
    } catch {
      // ignore invalid history payloads
    }
  }, []);

  useEffect(() => {
    const paramValue = searchParams.get('search') || '';
    setSearchTerm(displayStateTerm(paramValue));
  }, [searchParams]);

  const saveToHistory = useCallback((term: string) => {
    const normalizedTerm = term.trim();
    if (normalizedTerm.length < 2) return;

    const historyEntry = normalizedTerm.toLowerCase();
    const updatedHistory = [historyEntry, ...searchHistory.filter((item) => item !== historyEntry)].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  }, [searchHistory]);

  const executeSearch = useCallback((rawTerm: string) => {
    const trimmed = rawTerm.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set('search', normalizeStateNames(trimmed));
      saveToHistory(trimmed);
    } else {
      params.delete('search');
    }

    params.delete('cursor');

    startTransition(() => {
      const nextUrl = `/farms${params.toString() ? `?${params.toString()}` : ''}`;
      router.push(nextUrl, { scroll: false });
      setShowHistory(false);
    });
  }, [router, searchParams, saveToHistory, startTransition]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    executeSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    executeSearch('');
  };

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
    executeSearch(term);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const showSpinner = isPending;

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {showSpinner ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            type="text"
            inputMode="search"
            placeholder="Search by city, ZIP code, or farm name..."
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              if (validateSearchTerm(value)) {
                setSearchTerm(value);
              }
            }}
            onFocus={() => setShowHistory(true)}
            className="pl-10 pr-28 py-3"
            autoComplete="off"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-20 top-1/2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3"
            disabled={showSpinner}
          >
            Search
          </Button>
        </div>
      </form>

      {showHistory && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-background shadow-lg">
          <div className="p-2">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                Recent searches
              </span>
              <button onClick={clearHistory} className="hover:text-foreground">
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(term)}
                  className="w-full rounded px-2 py-1 text-left text-sm capitalize hover:bg-muted"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
      )}
    </div>
  );
}
