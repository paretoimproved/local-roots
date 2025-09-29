# CODEX.md

This file provides guidance to Codex (GPT-5 via the Codex CLI) when working with code in this repository. The filename remains `CLAUDE.md` for compatibility with existing automation that expects it to live at the repo root.

# Local-Roots: CSA Marketplace Platform

## Overview

LocalRoots is a Community Supported Agriculture (CSA) marketplace connecting local farmers with consumers. Built as a modern monorepo with React/Next.js frontend, Hono/Bun API backend, and PostgreSQL database using Drizzle ORM.

## Codex Assistant Setup
- Use Codex CLI with the repository root as the working directory so path references resolve correctly.
- Prefer `pnpm` for any workspace commands; avoid `npm` or `yarn` unless the task explicitly calls for them.
- Default to ASCII when editing files and document code references with `relative/path.ts:42` formatting.
- Break multi-step tasks into an explicit plan and update it as you complete steps.
- Run the most relevant `pnpm` checks (`pnpm test`, `pnpm lint`, `pnpm typecheck`) before handing over substantial changes.
- Follow the standards in `docs/ENGINEERING.md`—treat the Definition of Done, review expectations, and testing/deployment gates as mandatory checkpoints before calling work complete.

## Engineering Standards Alignment
- Review `docs/ENGINEERING.md` before starting a task and call out any acceptance criteria or review requirements in your plan.
- Maintain the Definition of Done checklist: ensure Linear ticket hygiene, pass lint/type/test commands, and document results in the hand-off.
- For collaborative work, reference the required engineering-manager approval flow and verify CI status before requesting merge.
- When operating solo, complete the self-review checklist (responsiveness, accessibility, error handling, performance) and note the outcomes in updates.
- Treat deployment steps as part of completion—include staging verification, production approval, and ticket status updates when relevant.

## Project Structure

```
├── apps/
│   ├── api/          # Hono API server (Bun runtime)
│   └── web/          # Next.js 14 frontend (React 18)
├── packages/
│   └── db/           # Shared database schema (Drizzle ORM)
└── .cursor/rules/    # Development guidelines for API, frontend, and database
```

## Development Commands

### Root Level (Monorepo)
```bash
# Start all services
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type checking across all packages
pnpm typecheck

# Lint all code
pnpm lint

# Clean all build artifacts
pnpm clean
```

### Frontend (apps/web)
```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run tests with Vitest
pnpm test
pnpm test:coverage
pnpm test:ui

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### API (apps/api)
```bash
# Development server with hot reload
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run tests with Vitest
pnpm test
pnpm test:coverage
pnpm test:ui

# Type checking
pnpm typecheck
```

### Database (packages/db)
```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Seed development data
pnpm db:seed
```

## MCP & External Integrations

### Linear MCP Server
- Create a Linear personal API key with the required scopes and export it as `LINEAR_API_KEY` before launching Codex.
- Start the Linear MCP server in a separate terminal (`npx @modelcontextprotocol/server-linear`) and note the websocket URL it prints.
- In Codex CLI, add that MCP endpoint so tools like `linear.list_issues`, `linear.get_issue`, and `linear.update_issue` become available.
- Keep Linear issues in sync with repo activity—move tickets from In Progress to Review/Done as you open PRs or land changes.
- **State IDs:**
  - Todo — `1f8bc22a-2353-46df-af48-a7fe2aa10f9b`
  - In Progress — `3fccf72f-aa21-468f-a936-dc9778b39748`
  - Testing — `e6d4f2c3-cdcd-4e0f-8476-8ff661639c9e`
  - In Review — `1b1f3dd9-3b0c-4764-982f-2ee673c33a93`
  - Done — `6da635fe-eed9-44fb-afbc-ec90673d9cbc`
  - Duplicate — `cb0dbc6a-347a-4751-85fe-9d91d6ed35fe`
  - Canceled — `eb3c5d74-47b5-4e72-8ac8-94a79e5deca6`

### Vercel Deployment Workflow
- Install the Vercel CLI and authenticate once with `vercel login`; verify access using `vercel whoami`.
- Link this repo to the Local-Roots Vercel project via `vercel link` and pull env vars locally with `vercel env pull .env.local` when needed.
- Run `pnpm build` (or the relevant app-level build) locally before shipping a deployment.
- Use `vercel --prod` for production deploys and `vercel --prebuilt --ship` if you are pushing an optimized build artifact.
- Monitor deployments with `vercel ls` and `vercel logs <deployment-url>` to catch issues early.

## Technology Stack

### Frontend (apps/web)
- **Framework:** Next.js 14.1.0 with App Router
- **UI Library:** shadcn/ui with Radix primitives
- **Styling:** TailwindCSS with custom design system
- **State Management:** TanStack Query (React Query)
- **Authentication:** Clerk
- **Testing:** Vitest + React Testing Library
- **Type Safety:** TypeScript with strict configuration

### Backend (apps/api)
- **Runtime:** Bun (JavaScript runtime & package manager)
- **Framework:** Hono (lightweight web framework)
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Clerk backend integration
- **Validation:** Zod schemas
- **Testing:** Vitest with Supertest for API testing

### Database (packages/db)
- **ORM:** Drizzle with PostgreSQL driver
- **Schema Management:** Drizzle Kit for migrations
- **Type Generation:** Automatic TypeScript types from schema
- **Development Tools:** Drizzle Studio for database exploration

## Architecture Patterns

### API Module Structure
```
apps/api/src/modules/[feature]/
├── [feature].routes.ts     # Hono route definitions
├── [feature].service.ts    # Business logic & database operations
└── [feature].test.ts       # Unit tests
```

### Frontend Component Organization
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   └── [feature]/
│       ├── page.tsx        # Route component
│       └── _components/    # Feature-specific components
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── [feature]/          # Shared feature components
│   └── shared/             # Cross-feature components
└── api/                    # API client functions
    └── [feature].api.ts    # Type-safe API calls
```

### Database Schema Pattern
```typescript
// Define table schema
export const tableName = pgTable('table_name', {
  id: varchar('id', { length: 255 }).primaryKey(),
  // ... other fields
});

// Export TypeScript types
export type TableName = InferSelectModel<typeof tableName>;
export type NewTableName = InferInsertModel<typeof tableName>;

// Create Zod validation schemas
export const tableInsertSchema = createInsertSchema(tableName);
export const tableSelectSchema = createSelectSchema(tableName);
```

## Development Guidelines

### API Development
- Use feature-based modules in `apps/api/src/modules/`
- Implement business logic in service layers
- Apply Clerk authentication middleware for protected routes
- Use Zod validation for request/response schemas
- Follow RESTful conventions for endpoint design
- Write unit tests for all service functions

### Frontend Development
- Prefer Server Components over Client Components when possible
- Use TanStack Query for all data fetching operations
- Co-locate feature-specific components in `_components/` directories
- Use shadcn/ui components with TailwindCSS for styling
- Implement proper error boundaries and loading states
- Write unit tests for complex component logic

### Database Development
- Define all schemas in `packages/db/src/schema.ts`
- Use Drizzle migrations for schema changes
- Implement proper indexing for performance-critical queries
- Export TypeScript types for frontend/backend consumption
- Use descriptive naming conventions for tables and columns

### Type Safety
- Share types between frontend and backend via `packages/db`
- Use RPC-style API client for type-safe frontend calls
- Leverage `InferRequestType` and `InferResponseType` for API types
- Validate all API inputs with Zod schemas
- Use strict TypeScript configuration across all packages

## Testing Strategy

### Unit Testing
- **Frontend:** React Testing Library with Vitest
- **Backend:** Vitest with Supertest for API endpoints
- **Database:** Test service layer functions with test database
- **Coverage:** Maintain >70% test coverage across all packages

### Integration Testing
- Test complete API flows from request to database
- Test React Query integration with API endpoints
- Verify error handling and edge cases
- Test authentication flows with Clerk

## Deployment

### Production Stack
- **Frontend:** Vercel (auto-deploy from main branch)
- **API:** Railway/Render (containerized deployment)
- **Database:** PostgreSQL on Railway/Supabase
- **Authentication:** Clerk (production environment)

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

# Clerk Authentication
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# API Configuration
NEXT_PUBLIC_API_URL=https://api.localroots.com
```

## Key Features Implemented

### Sprint 1 (COMPLETED)
- **Farm Discovery:** Infinite scroll listing with cursor pagination
- **Location Search:** Real-time search with debouncing and URL state
- **Farm Details:** Drawer component with image gallery and farm information
- **Authentication:** Clerk integration with user type selection
- **Database:** PostgreSQL schema with performance indexes
- **Testing:** Unit test coverage for core functionality

### Current Development Focus
- **CSA Share Management:** Create/edit share offerings
- **Subscription System:** Consumer subscription management
- **Payment Integration:** Stripe integration for subscriptions
- **Enhanced Search:** Location-based filtering and advanced search

## Performance Considerations

### Frontend Optimizations
- React Query for data caching and background updates
- Image optimization through Cloudinary integration
- Code splitting at route level with Next.js
- Lazy loading for non-critical components
- Core Web Vitals optimization (LCP <2.5s, FID <100ms, CLS <0.1)

### Backend Optimizations
- Cursor-based pagination for large datasets
- Database indexing for search and location queries
- Connection pooling for PostgreSQL
- Response compression and caching headers
- API rate limiting and request validation

### Database Performance
- Strategic indexing for cursor pagination and search
- Efficient foreign key relationships
- Query optimization with Drizzle ORM
- Regular performance monitoring and optimization

## Security Best Practices

- Clerk authentication for all user management
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM
- Environment variable management for secrets
- CORS configuration for API endpoints
- Rate limiting on public endpoints
- Secure cookie configuration for authentication

## Troubleshooting

### Common Issues
- **Build failures:** Check TypeScript errors and dependency conflicts
- **Database connections:** Verify DATABASE_URL and network connectivity
- **Authentication errors:** Confirm Clerk environment variables
- **API type mismatches:** Ensure shared types are exported from packages/db
- **Test failures:** Check test database configuration and mocking

### Development Tools
- **Drizzle Studio:** Visual database explorer
- **React Query Devtools:** Debug data fetching and caching
- **Turbo:** Monorepo build system with caching
- **Biome:** Fast linting and formatting
- **Vitest:** Test runner with hot reload

This project follows modern TypeScript development practices with strong type safety, comprehensive testing, and performance optimization throughout the stack.
