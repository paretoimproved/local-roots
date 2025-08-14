# Local-Roots Web Application

## Overview
Next.js-based frontend application for the Local-Roots CSA marketplace, providing a modern, accessible, and performant user experience.

## Linear Integration Instructions
**IMPORTANT:** Always update Linear ticket statuses as work progresses:
- **Backlog → In Progress:** When starting work on a ticket
- **In Progress → In Review:** When code is complete and PR created
- **In Review → Testing:** When PR is approved and ready for functional testing
- **Testing → Done:** Only after EM functional testing and PR merge

Use Linear MCP integration when available: `mcp__linear__update_issue`

## Architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** TailwindCSS + shadcn/ui
- **State Management:** React Query (TanStack)
- **Authentication:** Clerk
- **Language:** TypeScript

### Project Structure
```
apps/web/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── farms/        # Consumer discovery
│   │   └── dashboard/    # User dashboards
│   ├── components/       # React components
│   │   ├── farms/        # Farm-specific components
│   │   ├── ui/           # Shared UI components
│   │   └── auth/         # Authentication components
│   ├── api/             # API client functions
│   ├── hooks/           # Custom React hooks
│   └── lib/            # Utilities and helpers
```

## Core Features

### Consumer Experience
- Farm discovery with infinite scroll
- Location-based search
- Farm detail views
- CSA share browsing
- Subscription management

### Farmer Dashboard
- Farm profile management
- CSA share creation/editing
- Subscriber management
- Analytics dashboard

### Authentication
- Email/password sign up
- OAuth (Google)
- Password reset
- Email verification
- User type selection

## Component Architecture

### Design System (shadcn/ui)
- Consistent component library
- Accessible by default
- Customizable with Tailwind
- Dark mode ready

### Component Patterns
```typescript
// Presentational Component
interface ComponentProps {
  data: DataType;
  onAction?: () => void;
}

// Container Component
- Handles data fetching
- Manages state
- Passes props to presentational
```

### State Management

#### Server State (React Query)
- API data caching
- Background refetching
- Optimistic updates
- Infinite queries

#### Client State
- URL parameters for shareable state
- Local storage for preferences
- React context for global UI state

## Performance Optimizations

### Core Web Vitals
- **LCP:** < 2.5s (target: < 2s)
- **FID:** < 100ms
- **CLS:** < 0.1
- **TTI:** < 3.5s

### Optimization Techniques
- Next.js Image optimization
- Code splitting per route
- Dynamic imports for heavy components
- Prefetching critical resources
- Service worker caching

### Bundle Size Management
- Tree shaking unused code
- Component lazy loading
- External script optimization
- CSS purging with Tailwind

## Accessibility Standards (WCAG 2.1 AA)

### Implementation
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader testing

### Testing Tools
- axe DevTools
- WAVE evaluation
- Lighthouse audits
- Manual screen reader testing

## Testing Strategy

### Unit Tests (Vitest)
```typescript
describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });
});
```

### Integration Tests
- User flow testing
- API integration
- Authentication flows
- Error scenarios

### E2E Tests (Future)
- Critical user paths
- Cross-browser testing
- Mobile device testing

## Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Build for production
pnpm build
```

### Environment Variables
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_API_URL=...
DATABASE_URL=...
```

## Routing Structure

### Public Routes
- `/` - Landing page
- `/farms` - Farm discovery
- `/farms?search=term` - Search results
- `/farms?farm=id` - Farm details
- `/sign-in` - Authentication
- `/sign-up` - Registration

### Protected Routes
- `/dashboard/farmer` - Farmer dashboard
- `/dashboard/consumer` - Consumer dashboard
- `/dashboard/farmer/shares` - Share management
- `/select-user-type` - User type selection

## API Integration

### API Client Pattern
```typescript
// Centralized API client
const apiClient = {
  farms: {
    getAll: (params) => fetch(...),
    getById: (id) => fetch(...),
  }
};
```

### Error Handling
- Graceful degradation
- User-friendly error messages
- Retry logic for transient failures
- Offline support consideration

## Responsive Design

### Breakpoints
```css
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
- Wide: > 1440px
```

### Mobile-First Approach
- Touch-optimized interactions
- Appropriate font sizes
- Optimized images for mobile
- Reduced data usage

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 9+)

## Deployment

### Build Process
1. Type checking
2. Linting
3. Unit tests
4. Build optimization
5. Bundle analysis

### Hosting
- **Development:** localhost:3000
- **Staging:** Vercel preview deployments
- **Production:** Vercel production

### CI/CD Pipeline
- GitHub Actions for testing
- Automatic preview deployments
- Production deployment on main merge

## Monitoring & Analytics

### Performance Monitoring
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Error tracking
- API response times

### User Analytics
- Page views and user flows
- Feature usage tracking
- Conversion funnel analysis
- A/B testing framework

## Security Considerations

### Best Practices
- Content Security Policy (CSP)
- XSS prevention
- CSRF protection
- Secure authentication flow
- Input sanitization

### Data Privacy
- GDPR compliance ready
- User data encryption
- Secure cookie handling
- Privacy policy implementation

## Future Enhancements
- Progressive Web App (PWA)
- Offline functionality
- Push notifications
- Advanced search filters
- Real-time updates with WebSockets
- Internationalization (i18n)

## Team Ownership
- **Frontend Lead:** Alex Chen
- **UI/UX:** Alex Chen
- **Testing:** Sam Rodriguez
- **DevOps:** Sam Rodriguez

## Sprint Tracking

### Current Sprint: Sprint 1 (Aug 14-20, 2025)
- LOC-6: Farm Discovery Page ✅
- LOC-7: Location-Based Search ✅
- LOC-8: Farm Detail Drawer ✅

### Always Update Linear Status:
1. Move to "In Progress" when starting
2. Move to "In Review" when PR created
3. Move to "Testing" after PR approval
4. Move to "Done" only after EM testing

**Last Updated:** August 14, 2025
**Version:** 1.0.0