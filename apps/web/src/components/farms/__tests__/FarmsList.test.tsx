import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FarmsList } from '../FarmsList'
import { getFarms } from '@/api/farms.api'

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
    vi.mocked(getFarms).mockResolvedValue({
      success: true,
      data: [],
      nextCursor: null,
      hasMore: false,
    })
  })

  const renderWithQuery = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders loading skeletons while data is fetching', () => {
    vi.mocked(getFarms).mockImplementation(() => new Promise(() => {}))

    renderWithQuery(<FarmsList />)
    
    const skeletons = screen.getAllByTestId('farm-card-skeleton')
    expect(skeletons).toHaveLength(8)
  })

  it('renders farms after data loads and shows results message', async () => {
    vi.mocked(getFarms).mockResolvedValue({
      success: true,
      data: [
        { id: 'farm_1', name: 'Green Acres', userId: 'user_1', createdAt: '', updatedAt: '' },
        { id: 'farm_2', name: 'Fresh Fields', userId: 'user_2', createdAt: '', updatedAt: '' },
      ],
      nextCursor: null,
      hasMore: false,
    })

    renderWithQuery(<FarmsList />)

    const farmCards = await screen.findAllByTestId('farm-card')
    expect(farmCards).toHaveLength(2)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 local farms')).toBeInTheDocument()
    })
  })

  it('has correct responsive grid classes', () => {
    vi.mocked(getFarms).mockImplementation(() => new Promise(() => {}))

    const { container } = renderWithQuery(<FarmsList />)
    
    // Check that the grid container has correct classes
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1')
    expect(gridContainer?.className).toContain('sm:grid-cols-2')
    expect(gridContainer).toHaveClass('md:grid-cols-3')
    expect(gridContainer?.className).toContain('lg:grid-cols-4')
  })

  it('passes trimmed search query to the API', async () => {
    mockSearchParams.get.mockReturnValue('  brooklyn  ')
    vi.mocked(getFarms).mockResolvedValue({
      success: true,
      data: [],
      nextCursor: null,
      hasMore: false,
    })

    renderWithQuery(<FarmsList />)

    await waitFor(() => {
      expect(getFarms).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 20,
        search: 'brooklyn',
      })
    })
  })

  it('renders empty state when no farms are returned', async () => {
    vi.mocked(getFarms).mockResolvedValue({
      success: true,
      data: [],
      nextCursor: null,
      hasMore: false,
    })

    renderWithQuery(<FarmsList />)

    const emptyState = await screen.findByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

})
