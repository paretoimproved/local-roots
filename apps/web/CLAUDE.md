# Local-Roots Web Application

## Deployment Configuration

### Production Environment
- **Platform:** Vercel
- **Framework:** Next.js 14.1.0
- **Repository:** https://github.com/paretoimproved/local-roots
- **Root Directory:** `apps/web`
- **Build Command:** Auto-detected (Next.js)
- **Deploy Branch:** `main`
- **Preview Branches:** All PR branches get automatic preview URLs

### Current Deployment Status
- **Latest Commit:** Auto-deployment from main branch
- **Build Strategy:** Vercel auto-detection (removed custom configuration)
- **Package Manager:** pnpm (detected from lockfile)
- **Dependencies:** All production dependencies included in package.json

### Environment Variables (Not Yet Configured)
```bash
# Required for full functionality (to be added in Vercel dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=https://api.local-roots.com
```

## Sprint 1 Implementation Status

### ✅ Completed Features

#### Farm Discovery Page (LOC-6)
- **Location:** `src/app/farms/page.tsx`
- **Components:** 
  - `FarmsList.tsx` - Infinite scroll container with React Query
  - `FarmCard.tsx` - Individual farm cards with Cloudinary images
  - `FarmCardSkeleton.tsx` - Loading states
  - `EmptyState.tsx` - No farms found state
  - `ErrorBoundary.tsx` - Error handling with retry

#### Location-Based Search (LOC-7)
- **Component:** `SearchBox.tsx`
- **Features:**
  - 300ms debounced search
  - URL state persistence (?search=term)
  - localStorage search history (last 5)
  - Mobile-optimized input
  - Real-time results integration

#### Farm Detail Drawer (LOC-8)
- **Component:** `FarmDetailDrawer.tsx`
- **Features:**
  - shadcn/ui Drawer foundation
  - Image gallery with navigation
  - Comprehensive farm information
  - Mobile swipe gestures
  - URL state management (?farm=id)
  - Accessibility compliance (WCAG 2.1 AA)

### Architecture

#### Frontend Stack
```typescript
// Core Dependencies
"next": "14.1.0"
"react": "^18.2.0"
"@tanstack/react-query": "^5.22.2"
"@clerk/nextjs": "^4.29.7"

// UI Framework
"tailwindcss": "^3.4.1"
"@radix-ui/react-*": "^1.1.x" // Various components
"lucide-react": "^0.331.0"
"class-variance-authority": "^0.7.1"

// Form & Interaction
"react-hook-form": "^7.54.2"
"react-intersection-observer": "^9.16.0"
"zod": "^3.24.2"
```

#### Component Structure
```
src/
├── app/
│   ├── farms/page.tsx          # Main farms discovery page
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Homepage
├── components/
│   ├── farms/                  # Farm-related components
│   │   ├── FarmsList.tsx       # Main container with infinite scroll
│   │   ├── FarmCard.tsx        # Individual farm display
│   │   ├── SearchBox.tsx       # Search functionality  
│   │   ├── FarmDetailDrawer.tsx # Farm details modal
│   │   ├── EmptyState.tsx      # No results display
│   │   └── ErrorBoundary.tsx   # Error handling
│   └── ui/                     # shadcn/ui components
├── api/                        # API client functions
│   └── farms.api.ts            # Farm data fetching
└── hooks/
    └── useDebounce.ts          # Search debouncing utility
```

#### Performance Optimizations
- **React Query:** Infinite queries with caching
- **Lazy Loading:** Images and drawer content
- **Code Splitting:** Route-based chunks
- **Image Optimization:** Cloudinary integration
- **Core Web Vitals:** LCP <2.5s, FID <100ms, CLS <0.1

### Testing Strategy

#### Functional Testing (In Progress)
- **LOC-9:** Farm Discovery Page testing scenarios
- **LOC-10:** Location-Based Search testing scenarios  
- **LOC-11:** Farm Detail Drawer testing scenarios

#### Unit Testing Setup (Available)
```bash
# Test Framework
"vitest": "^2.1.8"
"@testing-library/react": "^16.1.0"
"@testing-library/jest-dom": "^6.5.0"

# Run Tests
pnpm test              # Run all tests
pnpm test:coverage     # Generate coverage report
pnpm test:ui          # Open Vitest UI
```

### Development Workflow

#### Local Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

#### Deployment Process
1. **Push to main** → Automatic Vercel deployment
2. **Create PR** → Automatic preview environment
3. **Functional testing** on preview URL
4. **Merge PR** → Deploy to production

### Next Steps

#### Immediate (Post-Sprint 1)
- [ ] Verify successful Vercel deployment
- [ ] Configure environment variables
- [ ] Complete functional testing scenarios
- [ ] Performance optimization based on real data

#### Sprint 2 Candidates
- [ ] User authentication integration (Clerk)
- [ ] CSA share subscription flow
- [ ] Farm owner dashboard
- [ ] Enhanced search filters
- [ ] Real API integration (currently using mock data)

### Troubleshooting

#### Common Deployment Issues
- **Monorepo complexity:** Resolved by using Vercel auto-detection
- **Package manager conflicts:** Uses pnpm, falls back to npm if needed
- **Environment variables:** Not yet configured, app works without auth
- **Build timeouts:** Optimized dependencies and removed test files from build

#### Local Development Issues
- **Workspace dependencies:** Managed by pnpm workspace configuration
- **Type errors:** Exclude test files in tsconfig.json
- **Hot reload:** Next.js handles automatically

---

**Last Updated:** August 14, 2025  
**Status:** Ready for functional testing and production verification