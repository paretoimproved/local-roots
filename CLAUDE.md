# Local-Roots Engineering Management Playbook

## Linear Status Management Instructions

**CRITICAL: Always update Linear ticket status as work progresses:**

1. **Backlog → In Progress**: When starting work on a ticket
2. **In Progress → In Review**: When code is complete and PR is created
3. **In Review → Testing**: After PR approval, ready for functional testing
4. **Testing → Done**: Only after EM completes functional testing and PR is merged

**Use Linear MCP integration when available:**
```
mcp__linear__update_issue(id, state)
```

**If MCP unavailable, remind EM to update manually in Linear.**

## Sprint 1: Consumer Farm Discovery (Aug 14-20, 2025)

### Sprint Goal
"Enable consumers to discover and browse local farms through an intuitive, mobile-first experience"

### Team Structure
- **Alex Chen** (Frontend Specialist) - React/Next.js, UI/UX focus
- **Jordan Kim** (Backend Specialist) - API development, database optimization  
- **Sam Rodriguez** (QA Engineer) - Test automation, manual testing
- **Engineering Manager** - Sprint planning, stakeholder management, technical decisions

### Sprint Commitment: 13 Story Points

## Epic: Consumer Farm Discovery (LR-1)
**Status:** In Progress  
**Business Value:** Foundation for marketplace revenue - consumers must discover farms before subscribing to CSA shares.

**Success Criteria:**
- Consumers can view all available farms in organized layout
- Location-based search returns relevant results
- Farm details provide comprehensive information for decision-making
- 100% mobile responsive experience
- Page load performance <2s, search results <500ms

---

## User Stories & Technical Specifications

### LR-2: Farm Discovery Page (5 Points)
**Assignee:** Alex Chen (Frontend Lead)

**User Story:**
As a consumer, I want to see all available farms in an organized list so that I can discover local farming options.

**Acceptance Criteria:**
- [ ] Display farms in responsive grid layout (mobile: 1 col, tablet: 2 col, desktop: 3 col)
- [ ] Farm cards show: name, location, description, primary image
- [ ] Implement cursor-based pagination (20 farms per page)
- [ ] Loading states with skeleton components for all screen sizes
- [ ] Empty state with helpful messaging when no farms exist
- [ ] Comprehensive error handling for API failures with retry options
- [ ] Image optimization through Cloudinary integration
- [ ] Infinite scroll with React Query infinite queries
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1

**Technical Architecture:**
```typescript
// Frontend Structure
pages/farms/index.tsx
├── FarmsList (Container)
├── FarmCard (Presentational)  
├── LoadingGrid (Skeleton)
├── EmptyState (No farms)
└── ErrorBoundary

// State Management
- React Query infinite queries for data fetching/caching
- URL state for pagination
- TanStack Virtual for performance with large datasets

// API Integration
GET /api/farms?cursor=xxx&limit=20
Response: { data: Farm[], nextCursor: string | null, hasMore: boolean }
```

**Backend Architecture:**
```typescript
// Database
- Add index: CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC)
- Cursor format: base64(created_at|id)
- Pagination: LIMIT 20 OFFSET cursor_position

// Error Handling
- 400: Invalid cursor format
- 404: No farms found
- 500: Database errors with retry logic
```

---

### LR-3: Location-Based Search (5 Points)  
**Assignee:** Jordan Kim (Backend) + Alex Chen (Frontend)

**User Story:**
As a consumer, I want to search farms by ZIP code or city name so that I can find farms near my location.

**Acceptance Criteria:**
- [ ] Search input accepts ZIP codes and city names
- [ ] Real-time search with 300ms debouncing
- [ ] Results update without page reload using existing farm grid
- [ ] Clear search functionality with 'X' button
- [ ] "No results found" state with helpful messaging and search tips
- [ ] Search terms persist in URL for sharing (?search=brooklyn)
- [ ] Search history stored in localStorage (last 5 searches)
- [ ] Mobile-optimized search input with appropriate keyboard
- [ ] Search performance: Results in <500ms

**Technical Architecture:**
```typescript
// Frontend
components/SearchBox.tsx
├── useDebounce(searchTerm, 300ms)
├── useSearchParams for URL sync
├── localStorage for search history
└── Integration with existing FarmsList

// Backend  
GET /api/farms?search=term&cursor=xxx
// Query: ILIKE pattern matching on name and description
WHERE (name ILIKE %$1% OR description ILIKE %$1%)
// Index: CREATE INDEX farms_search_idx ON farms USING GIN(to_tsvector('english', name || ' ' || description))
```

**Key Decisions:**
- Simple ILIKE search over full-text search for MVP
- 300ms debounce for optimal UX
- URL state persistence for sharing
- Request cancellation via React Query

---

### LR-4: Farm Detail Drawer (3 Points)
**Assignee:** Alex Chen (Frontend Specialist)

**User Story:**
As a consumer, I want to click on a farm to see detailed information so that I can learn about their practices and CSA offerings.

**Acceptance Criteria:**
- [ ] Drawer component slides in from right on farm card click
- [ ] Display comprehensive farm details: full description, contact info, location
- [ ] Image gallery with multiple farm photos and smooth navigation
- [ ] List available CSA shares with pricing information
- [ ] Mobile-optimized drawer with swipe-to-close gesture
- [ ] Keyboard navigation (Escape to close, Tab for focus management)
- [ ] URL updates to reflect open drawer (?farm=farm-id)
- [ ] Close drawer returns user to exact previous scroll position
- [ ] Accessibility compliance (ARIA labels, screen reader support)

**Technical Architecture:**
```typescript
// Component Structure
components/FarmDetailDrawer.tsx
├── shadcn/ui Drawer (base component)
├── ImageGallery (Embla Carousel)
├── FarmInfo (Details)
├── CSAShares (Pricing list)
└── ContactInfo

// API
GET /api/farms/:id
Response: {
  farm: Farm,
  csaShares: Share[],
  images: CloudinaryUrl[]
}
```

---

## Architecture Decisions Record (ADR)

### ADR-001: Pagination Strategy
**Decision:** Cursor-based pagination with infinite scroll
**Rationale:** Better performance, no offset limitations, seamless UX
**Alternatives Rejected:** Offset pagination (doesn't scale), client-side pagination (poor performance)

### ADR-002: Search Implementation  
**Decision:** PostgreSQL ILIKE with GIN indexes
**Rationale:** Simple, fast for MVP, easily upgradeable to full-text search
**Alternatives Rejected:** Full-text search (over-engineered for MVP), external search service (additional complexity)

### ADR-003: Image Management
**Decision:** Cloudinary for image hosting and optimization
**Rationale:** Automatic optimization, CDN delivery, generous free tier, reduces server load
**Alternatives Rejected:** Local storage (no CDN, scaling issues), S3 (requires custom optimization)

### ADR-004: Component Architecture
**Decision:** Drawer component for farm details
**Rationale:** Better mobile UX than modals, maintains browsing context, good accessibility
**Alternatives Rejected:** Modal (accessibility issues), separate page (breaks UX flow)

---

## Development Workflow

### Definition of Done
- [ ] Code reviewed and approved
- [ ] Unit and integration tests passing
- [ ] Manual testing on mobile/desktop completed
- [ ] Performance benchmarks met (<2s load, <500ms search)
- [ ] Error handling tested and documented
- [ ] Accessibility requirements verified
- [ ] Deployed to staging environment

### Testing Strategy
- **Unit Tests:** Component logic, API endpoints, utility functions
- **Integration Tests:** Full user flows, API + Frontend integration
- **E2E Tests:** Critical path automation (farm discovery → detail view)
- **Performance Tests:** Load time benchmarks, search responsiveness

### CI/CD Pipeline (GitHub Actions)
```yaml
# Triggers: Push to main, PR to main
jobs:
  - Type check (TypeScript)
  - Lint (ESLint + Prettier)
  - Test (Vitest unit + integration)
  - Build (Next.js + API)
  - Deploy to staging (auto)
  - Deploy to production (manual approval)
```

---

## Sprint 1 Execution Plan

### Week Breakdown
**Day 1-2:** Setup + LR-2 Backend (Jordan) | LR-2 Frontend scaffolding (Alex)
**Day 3-4:** LR-2 completion + LR-3 Backend (Jordan) | LR-3 Frontend (Alex) 
**Day 5:** LR-4 implementation (Alex) | Testing & QA (Sam)
**Day 6-7:** Integration, testing, deployment prep

### Parallel Work Strategy
1. **Backend APIs first** → Frontend can mock initially
2. **React Query setup** → Enables parallel frontend/backend development
3. **Shared component library** → Reduces duplication across stories

### Risk Mitigation
- **Technical Risk:** Cursor pagination complexity → Use React Query infinite queries
- **Performance Risk:** Image loading → Cloudinary auto-optimization + lazy loading  
- **Integration Risk:** API changes → API-first development with OpenAPI specs
- **Timeline Risk:** Scope creep → Fixed story points, defer enhancements to Sprint 2

---

## Stakeholder Communication

### Daily Standup Template
- **Yesterday:** What was completed
- **Today:** Current focus and blockers
- **Blockers:** Technical or process impediments

### Sprint Review Preparation
- **Demo:** Farm discovery → search → detail flow
- **Metrics:** Performance benchmarks, test coverage
- **Feedback:** User experience and technical feedback
- **Next Sprint:** Backlog grooming for subscription flow

---

## Tools & Configuration

### Development Stack
- **Frontend:** Next.js, React Query, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Hono, PostgreSQL, Drizzle ORM
- **Testing:** Vitest, React Testing Library, Playwright (E2E)
- **Infrastructure:** GitHub Actions, Cloudinary, Vercel/Railway

### Project Management
- **Linear:** https://linear.app/local-roots-engineering/
- **GitHub:** Local-Roots repository
- **Communication:** Sprint planning, daily standups, retrospectives

### Monitoring & Observability
- **Performance:** Core Web Vitals, API response times
- **Errors:** Frontend error boundaries, API error logging
- **Usage:** Farm discovery analytics, search query analysis

---

## Sprint 1 Success Metrics

### Technical Metrics
- [ ] Farm discovery page loads <2s (LCP)
- [ ] Search results appear <500ms
- [ ] 95% uptime for all API endpoints
- [ ] >90 Lighthouse score (mobile)
- [ ] Zero critical accessibility violations

### Business Metrics
- [ ] 100% of farms display correctly
- [ ] Search finds relevant results
- [ ] Farm detail drawer provides comprehensive information
- [ ] Mobile experience is fully functional

### Quality Metrics  
- [ ] >80% test coverage (unit + integration)
- [ ] All acceptance criteria verified
- [ ] Cross-browser compatibility (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness verified (iOS + Android)

---

## Next Sprint Planning

### Sprint 2 Candidates (Post-Discovery)
- **LR-5:** CSA Share subscription flow
- **LR-6:** User authentication and profiles  
- **LR-7:** Farm owner dashboard enhancements
- **LR-8:** Payment processing integration

### Technical Debt
- Upgrade to full-text search if needed
- Performance optimizations based on Sprint 1 metrics
- Enhanced error handling and monitoring
- Accessibility improvements

---

**Last Updated:** August 14, 2025  
**Next Review:** Sprint 1 Retrospective (August 20, 2025)