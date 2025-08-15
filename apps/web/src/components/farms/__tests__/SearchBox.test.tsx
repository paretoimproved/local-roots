import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBox } from '../SearchBox'

// Mock Next.js navigation hooks
const mockPush = vi.fn()
const mockSearchParams = {
  get: vi.fn(() => ''),
  toString: vi.fn(() => ''),
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock the useDebounce hook to return value immediately
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

describe('SearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.get.mockReturnValue('')
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })
  })

  it('renders search input with correct placeholder', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByPlaceholderText(/search by city, zip code, or farm name/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('has correct input attributes', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveAttribute('type', 'search')
    expect(searchInput).toHaveAttribute('inputMode', 'search')
    expect(searchInput).toHaveAttribute('autoComplete', 'off')
  })

  it('updates input value when user types', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    expect(searchInput.value).toBe('brooklyn')
  })

  it('shows clear button when search term exists', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    const clearButton = screen.getByRole('button')
    expect(clearButton).toBeInTheDocument()
    
    // Check for sr-only text content
    expect(screen.getByText('Clear search')).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'brooklyn' } })
    
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)
    
    expect(searchInput.value).toBe('')
  })

  it('validates search input and rejects invalid characters', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement
    
    // Try to input invalid characters (the validation should prevent this)
    fireEvent.change(searchInput, { target: { value: 'test<script>alert("xss")</script>' } })
    
    // The validation function should have prevented the invalid input
    expect(searchInput.value).not.toContain('<script>')
  })

  it('preserves search term from URL parameters', () => {
    mockSearchParams.get.mockReturnValue('existing-search')
    
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement
    expect(searchInput.value).toBe('existing-search')
  })

  it('handles form submission without page reload', () => {
    render(<SearchBox />)
    
    const searchInput = screen.getByRole('searchbox')
    const form = searchInput.closest('form')
    
    expect(form).toBeInTheDocument()
    
    if (form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault')
      
      form.dispatchEvent(submitEvent)
      expect(preventDefaultSpy).toHaveBeenCalled()
    }
  })
})