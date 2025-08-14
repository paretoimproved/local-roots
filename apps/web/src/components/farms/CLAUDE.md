# Farms Components Module

## Overview
React components for the consumer farm discovery feature, implementing a mobile-first, accessible, and performant user experience.

## Component Architecture

### FarmsList
**Purpose:** Container component managing farm data fetching and infinite scroll.

**Features:**
- React Query infinite queries for data management
- Intersection Observer for auto-loading
- Search parameter integration
- Error boundary implementation
- Loading state management

**Props:** None (uses URL parameters)

**Performance:**
- Virtual scrolling ready
- Lazy loading images
- Debounced API calls
- Stale-while-revalidate caching

### FarmCard
**Purpose:** Presentational component for individual farm display.

**Props:**
```typescript
interface FarmCardProps {
  farm: Farm;
  priority?: boolean; // Image loading priority
  onClick?: () => void;
}
```

**Features:**
- Responsive image handling
- Click to open detail drawer
- Hover animations
- Mobile touch optimized

### SearchBox
**Purpose:** Real-time search input with history.

**Features:**
- 300ms debounce for performance
- URL state persistence
- Local storage history (5 items)
- Keyboard navigation
- Clear button
- Mobile keyboard optimization

**Search Flow:**
1. User types → Debounce 300ms
2. Update URL parameters
3. FarmsList detects change
4. API call with search term
5. Results update in place

### FarmDetailDrawer
**Purpose:** Sliding drawer for detailed farm information.

**Props:** None (uses URL parameter `?farm=id`)

**Features:**
- Smooth slide animations
- Keyboard navigation (Escape)
- Backdrop click to close
- Mobile swipe gestures
- Deep linking support
- Focus management

**Accessibility:**
- ARIA labels and roles
- Focus trap when open
- Screen reader announcements
- Keyboard navigation

### FarmCardSkeleton
**Purpose:** Loading placeholder during data fetch.

**Features:**
- Matches FarmCard dimensions
- Subtle animation
- Prevents layout shift

### EmptyState
**Purpose:** User-friendly messaging when no farms found.

**Props:**
```typescript
interface EmptyStateProps {
  searchQuery?: string;
}
```

**States:**
- No farms in system
- No search results
- Search tips and suggestions

### ErrorBoundary
**Purpose:** Graceful error handling with recovery options.

**Props:**
```typescript
interface ErrorBoundaryProps {
  error: any;
  reset: () => void;
}
```

**Error Types:**
- Network failures
- API errors
- Invalid data
- Development debug info

## State Management

### URL State
- Search terms: `?search=brooklyn`
- Farm detail: `?farm=farm_123`
- Pagination cursor: Handled internally

### Local State
- Search history in localStorage
- Drawer open/close state
- Loading states

### Server State (React Query)
- Farm list with infinite pagination
- Individual farm details
- Automatic cache invalidation
- Background refetching

## Performance Optimizations

### Image Loading
- Next.js Image component
- Responsive srcsets
- Priority loading for above-fold
- Lazy loading for below-fold
- Cloudinary optimization

### Bundle Size
- Component code splitting
- Dynamic imports where applicable
- Tree-shaking unused code

### Rendering
- React.memo for expensive components
- useCallback for event handlers
- Debounced search input
- Virtual scrolling ready

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- Tab through all interactive elements
- Escape closes drawer
- Enter activates buttons
- Arrow keys for future enhancements

### Screen Readers
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for updates
- Focus management

### Mobile Accessibility
- Touch target sizes (44x44px minimum)
- Swipe gestures
- Viewport considerations
- Font scaling support

## Testing Strategy

### Unit Tests
- Component rendering
- User interactions
- State management
- Error scenarios

### Integration Tests
- Search flow
- Pagination
- Drawer interactions
- API integration

### E2E Test Scenarios
1. Browse farms → Search → View details
2. Empty search → Clear → Results return
3. Direct link to farm detail
4. Mobile swipe interactions

## Responsive Design

### Breakpoints
- Mobile: < 768px (1 column)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (3 columns)

### Mobile Optimizations
- Touch-optimized interactions
- Appropriate font sizes
- Drawer full width on mobile
- Native scrolling

## Browser Support
- Chrome/Edge (latest 2)
- Firefox (latest 2)
- Safari (latest 2)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 5+)

## Dependencies
- `react`: UI library
- `next`: Framework
- `@tanstack/react-query`: Data fetching
- `react-intersection-observer`: Infinite scroll
- `lucide-react`: Icons
- `@/components/ui`: Shared UI components

## Related Pages
- `/farms`: Main discovery page
- `/farms?search=term`: Search results
- `/farms?farm=id`: Farm detail view

## Sprint 1 Implementation (LOC-6, LOC-7, LOC-8)
- ✅ Farm discovery grid
- ✅ Infinite scroll pagination
- ✅ Real-time search
- ✅ Farm detail drawer
- ✅ Mobile responsive
- ✅ Accessibility compliant

**Last Updated:** August 14, 2025
**Owner:** Alex Chen (Frontend)