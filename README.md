# Local Roots - CSA Marketplace Platform

🌱 Connect local farmers with consumers through an enterprise-grade Community Supported Agriculture (CSA) marketplace.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Sprint%201%20Complete-success)](https://linear.app/local-roots-engineering)

## Vision
LocalRoots is a two-sided marketplace connecting local farmers with consumers seeking fresh, seasonal produce through Community Supported Agriculture (CSA) subscriptions. We're building the definitive platform for discovering, comparing, and managing CSA shares - making local food as accessible as online shopping.

## Sprint 1 Features (Completed ✅)

### Consumer Farm Discovery
- ✅ **Farm Discovery Page** - Browse all farms with infinite scroll
- ✅ **Location-Based Search** - Real-time search by city/ZIP code
- ✅ **Farm Detail Drawer** - Comprehensive farm information
- ✅ **Mobile Responsive** - Optimized for all devices
- ✅ **Accessibility** - WCAG 2.1 AA compliant

### Technical Achievements
- ✅ Cursor-based pagination for scalability
- ✅ Real-time search with 300ms debouncing
- ✅ Comprehensive error handling
- ✅ Performance optimized (<2s page load)
- ✅ Full test coverage with Vitest

### Sprint 2 Features (Upcoming)
- 🔄 CSA share subscription flow
- 🔄 Payment processing (Stripe)
- 🔄 Farmer analytics dashboard
- 🔄 Advanced search filters

## Technical Implementation

### Database Schema
```typescript
// Simplified initial schema
interface Farm {
  id: string
  userId: string // Clerk Auth ID
  name: string
  description: string
  location: {
    latitude: number
    longitude: number
    address: string
  }
  images: string[]
  createdAt: Date
}

interface CSAShare {
  id: string
  farmId: string
  name: string
  description: string
  price: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  available: boolean
  startDate: Date
  endDate: Date
}

interface Subscription {
  id: string
  userId: string // Clerk Auth ID
  shareId: string
  status: 'active' | 'paused' | 'cancelled'
  startDate: Date
  nextDelivery: Date
}
```

## Future Phases

### Phase 2: Enhanced Features
- Payment processing integration (Stripe)
- Messaging system between farmers and subscribers
- Share contents management
- Delivery/pickup scheduling
- Basic analytics for farmers

### Phase 3: Advanced Features
- Review and rating system
- Advanced search filters
- Subscription pausing/rescheduling
- Mobile app development
- Weather integration for harvest forecasting

### Phase 4: Premium Features
- Route optimization for deliveries
- Advanced analytics dashboard
- Marketing tools for farmers
- Seasonal planning tools
- Integration with farm management software

## Development Roadmap

### Phase 1 Implementation Plan

1. **Setup & Authentication (Week 1)** ✅
   - ✅ Initialize project structure
   - ✅ Implement Clerk authentication
   - ✅ Create user type selection flow

2. **Farm Management (Week 2)** ⏳
   - ✅ Create farm profile CRUD
   - ⏳ Implement image upload
   - ⏳ Basic location services

3. **CSA Shares (Week 2-3)** ⏳
   - ⏳ Share creation and management
   - ⏳ Listing and search functionality
   - ⏳ Basic location-based filtering

4. **Subscriptions (Week 3-4)**
   - ⏳ Subscribe flow
   - ⏳ Basic subscription management
   - ⏳ Dashboard views for both user types

5. **UI/UX & Testing (Week 4)**
   - ⏳ Polish core user flows
   - ⏳ Mobile responsiveness
   - ⏳ Basic error handling
   - ⏳ Initial testing

## Implementation Progress

### Completed
- ✅ Project structure and repository setup
- ✅ Database schema definition with Drizzle ORM
- ✅ Basic API structure with Hono
- ✅ Farm management API endpoints
- ✅ Authentication with Clerk
  - ✅ Email/password authentication
  - ✅ Password reset functionality
  - ✅ Email verification flow
  - ✅ OAuth authentication
- ✅ Basic frontend structure with Next.js
- ✅ Basic dashboard UI for farmers and consumers
- ✅ User profile management
- ✅ User type selection and routing

### In Progress
- ⏳ CSA Share management implementation
- ⏳ Farm discovery and browsing features
- ⏳ Subscription management
- ⏳ Image upload for farms

### Next Steps
1. Complete CSA Share API endpoints and frontend
2. Implement location-based search functionality
3. Build subscription management features
4. Polish UI and user flows
5. Add comprehensive testing

## Project Structure
```
├── apps/
│   ├── api/                  # Bun API backend
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── farms/    # Farm-related endpoints
│   │   │   │   ├── shares/   # CSA share endpoints
│   │   │   │   └── subscriptions/ # Subscription endpoints
│   │   │   └── pkg/          # Shared utilities
│   │   └── index.ts          # Main application
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── dashboard/      # Dashboard pages
│       │   │   │   ├── farmer/     # Farmer dashboard
│       │   │   │   └── consumer/   # Consumer dashboard
│       │   │   ├── auth/           # Authentication pages
│       │   │   │   ├── sign-up/    # Sign-up flow
│       │   │   │   └── forgot-password/ # Password reset
│       │   │   ├── sign-in/        # Sign-in with catch-all routes
│       │   │   ├── farms/          # Farm discovery pages
│       │   │   ├── shares/         # CSA share pages
│       │   │   └── subscriptions/  # Subscription management
│       │   └── components/         # Shared components
└── packages/                 # Shared packages
    └── db/                   # Database schema and utilities
        ├── src/
        │   ├── schema.ts     # Drizzle schema definitions
        │   └── types.ts      # Shared TypeScript types
```

## Tech Stack
- Frontend: Next.js, TailwindCSS, shadcn/ui
- Backend: Hono, Bun
- Database: PostgreSQL with Drizzle ORM
- Authentication: Clerk
- Deployment: Vercel (frontend), Render (backend)

## Authentication Features
- Email/password authentication
- OAuth providers (Google, etc.)
- Password reset flow
- Email verification
- User type selection (Farmer or Consumer)
- Protected routes with middleware
- Session management

## Development Guidelines

### Code Organization
- Follow feature-based module organization
- Keep business logic in service layer
- Use TypeScript for type safety across the stack
- Follow the patterns established in the project structure

### API Design
- RESTful API endpoints grouped by resource
- Consistent error handling and response formats
- Proper validation using zod schemas
- Authentication middleware for protected routes

### Frontend Architecture
- Use Next.js App Router for routing
- Server Components for data fetching when possible
- Client Components for interactive elements
- Shadcn/UI for component library
- TanStack Query for data fetching and state management

### Database
- Use Drizzle ORM for database operations
- Follow migration patterns for schema changes
- Create appropriate indexes for query performance
- Leverage PostgreSQL's geometric types for location queries

## Getting Started

### Prerequisites
- Node.js 22 or later
- Bun 1.0.0 or later
- PNPM 9.0.0 or later
- PostgreSQL database (or a Supabase account)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/local-roots.git
cd local-roots
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
   - Create .env files in apps/api, apps/web, and packages/db
   - Configure your database connection and Clerk authentication

4. Run the development servers
```bash
pnpm dev
```

This will start both the API (http://localhost:3004) and web app (http://localhost:3000).

### Testing Auth Flow in Development
When testing the authentication flow in development:
1. Use test emails in the format `test+clerk_test@example.com`
2. For email verification, use the code `424242`
3. This allows testing the complete auth flow without sending real emails

