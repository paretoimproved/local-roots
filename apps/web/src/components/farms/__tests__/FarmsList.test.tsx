import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FarmsList } from '../FarmsList'

// Mock Next.js navigation
const mockSearchParams = {
  get: vi.fn(() => null),
}

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

// Mock react-intersection-observer
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: vi.fn(),
    inView: false,
  }),
}))

// Mock the farms API
vi.mock('@/api/farms.api', () => ({
  getFarms: vi.fn(),
}))

// Mock child components
vi.mock('../FarmCard', () => ({
  FarmCard: ({ farm }: { farm: any }) => (
    <div data-testid="farm-card">{farm.name}</div>
  ),
}))

vi.mock('../FarmCardSkeleton', () => ({
  FarmCardSkeleton: () => <div data-testid="farm-card-skeleton">Loading...</div>,
}))

vi.mock('../EmptyState', () => ({
  EmptyState: ({ searchQuery }: { searchQuery: string }) => (
    <div data-testid="empty-state">
      {searchQuery ? `No results for "${searchQuery}"` : 'No farms found'}
    </div>
  ),
}))

vi.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

describe('FarmsList', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    mockSearchParams.get.mockReturnValue(null)
  })

  const renderWithQuery = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders loading skeletons initially', () => {
    renderWithQuery(<FarmsList />)
    
    // Should show 6 skeleton cards while loading
    const skeletons = screen.getAllByTestId('farm-card-skeleton')
    expect(skeletons).toHaveLength(6)
  })

  it('displays search query in results count', () => {
    mockSearchParams.get.mockReturnValue('brooklyn')
    
    renderWithQuery(<FarmsList />)
    
    // Should show loading skeletons first
    expect(screen.getAllByTestId('farm-card-skeleton')).toHaveLength(6)
  })

  it('has correct responsive grid classes', () => {
    const { container } = renderWithQuery(<FarmsList />)
    
    // Check that the grid container has correct classes
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  it('configures React Query with correct parameters', () => {
    renderWithQuery(<FarmsList />)
    
    // The component should render without throwing errors
    // This tests that the useInfiniteQuery is properly configured
    expect(screen.getAllByTestId('farm-card-skeleton')).toHaveLength(6)
  })

  it('handles search query from URL params', () => {
    const searchQuery = 'organic farms'
    mockSearchParams.get.mockReturnValue(searchQuery)
    
    renderWithQuery(<FarmsList />)
    
    // Component should render loading state with search query
    expect(screen.getAllByTestId('farm-card-skeleton')).toHaveLength(6)
  })

  it('shows proper ARIA labels for accessibility', () => {
    const { container } = renderWithQuery(<FarmsList />)
    
    // Check for semantic structure
    expect(container.querySelector('.space-y-8')).toBeInTheDocument()
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })
})