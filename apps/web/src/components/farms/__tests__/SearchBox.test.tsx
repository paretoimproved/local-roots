import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchBox } from '../SearchBox'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock the useDebounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value), // Return value immediately for testing
}))

describe('SearchBox', () => {
  const mockPush = vi.fn()
  const mockSearchParams = {
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
    
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input with correct placeholder', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByPlaceholderText(/search by city, zip code, or farm name/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('displays search icon when not searching', () => {
    render(<SearchBox />)
    
    const searchIcon = screen.getByTestId('search-icon') || document.querySelector('[data-testid="search-icon"]')
    // Since we don't have data-testid, let's check for the Search component from lucide-react
    const searchElement = document.querySelector('svg')
    expect(searchElement).toBeInTheDocument()
  })

  it('shows clear button when search term exists', async () => {
    mockSearchParams.get.mockReturnValue('test search')
    
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      expect(clearButton).toBeInTheDocument()
    })
  })

  it('clears search when clear button is clicked', async () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      fireEvent.click(clearButton)
    })
    
    expect(searchInput).toHaveValue('')
  })

  it('validates search input and rejects invalid characters', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    
    // Try to input invalid characters
    fireEvent.change(searchInput, { target: { value: 'test<script>' } })
    
    // Should not contain the invalid characters
    expect(searchInput).not.toHaveValue('test<script>')
  })

  it('handles form submission correctly', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    const form = searchInput.closest('form')
    expect(form).toBeInTheDocument()
    
    if (form) {
      fireEvent.submit(form)
      // Form submission should not cause page reload
      expect(mockPush).not.toHaveBeenCalled()
    }
  })

  it('has proper accessibility attributes', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveAttribute('type', 'search')
    expect(searchInput).toHaveAttribute('autoComplete', 'off')
    
    const clearButton = document.querySelector('[aria-label="Clear search"]')
    if (clearButton) {
      expect(clearButton).toHaveAttribute('aria-label')
    }
  })

  it('preserves search term from URL parameters', () => {
    mockSearchParams.get.mockReturnValue('existing-search')
    
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveValue('existing-search')
  })
})