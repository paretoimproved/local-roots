# Engineering Standards & Guidelines

## Definition of Done

### ✅ Ticket Requirements
- [ ] Linear ticket created with clear acceptance criteria
- [ ] Story points estimated (1, 2, 3, 5, 8, 13)
- [ ] Sprint assigned and priority set
- [ ] Assignee confirmed

### ✅ Development Standards
- [ ] TypeScript strict mode compliance
- [ ] Unit tests written with >80% coverage
- [ ] Integration tests for API endpoints (where applicable)
- [ ] Component tests for UI interactions
- [ ] All linting rules pass (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)

### ✅ Code Review Process

#### Team Development (When Multiple Developers)
- [ ] Feature branch created from `main`
- [ ] Pull Request created with Linear ticket reference
- [ ] PR template fully completed
- [ ] **Engineering Manager +1 approval required** (@brandonqueener)
- [ ] All CI checks passing (tests, lint, build)
- [ ] **No ticket marked complete without EM +1**

#### Solo Development Mode (@brandonqueener only)
- [ ] Feature branch created from `main`
- [ ] Pull Request created with comprehensive description and test plan
- [ ] **Self-review checklist completed** (see below)
- [ ] All CI checks passing (tests, lint, build)
- [ ] 24-hour cooling off period for complex features (optional)
- [ ] Merge after self-review approval

**Solo Development Self-Review Checklist:**
- [ ] Code follows all project conventions and standards
- [ ] All acceptance criteria met and documented in PR
- [ ] Error handling and edge cases covered
- [ ] Mobile responsiveness verified at all breakpoints
- [ ] Performance requirements met (<2s page load)
- [ ] Accessibility standards followed (WCAG 2.1 AA)
- [ ] TypeScript strict mode compliance (0 errors)
- [ ] ESLint compliance (0 warnings)
- [ ] Design system compliance verified

### ✅ Deployment Pipeline
- [ ] Code deployed to staging environment
- [ ] Functional testing completed on staging
- [ ] Cross-browser/device testing completed
- [ ] Production deployment approved by EM
- [ ] Post-deployment verification in production
- [ ] Linear ticket moved to "Done" status

## Code Quality Standards

### TypeScript Configuration
- **Strict mode**: Always enabled
- **No implicit any**: Required
- **Unused locals**: Error on unused variables
- **No unused parameters**: Warning level

### Testing Requirements
- **Unit Tests**: >80% coverage for utilities and business logic
- **Component Tests**: All interactive components must have tests
- **Integration Tests**: API endpoints and critical user flows
- **E2E Tests**: Core user journeys (signup, subscription, payment)

### Code Style
- **Prettier**: Automated formatting on commit
- **ESLint**: Extended from Next.js and TypeScript recommended
- **Import organization**: Automated sorting and grouping
- **Naming conventions**: camelCase for variables, PascalCase for components

## Branch Strategy

### Branch Types
- `main` - Production-ready code, protected branch
- `develop` - Integration branch for features (if needed)
- `feature/LR-XXX-description` - Feature development
- `hotfix/description` - Critical production fixes
- `chore/description` - Maintenance and tooling updates

### Branch Protection Rules
- Require PR reviews before merge
- Require status checks to pass
- Require branches to be up to date
- No direct commits to main
- Require signed commits (optional)

## Commit Convention

### Format
```
<type>(scope): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Examples
```bash
feat(payments): add stripe subscription checkout

Implements recurring payment flow for CSA subscriptions
- Added Stripe checkout session creation
- Integrated webhook handling for payment confirmation
- Added subscription status tracking

Closes LR-123

fix(ui): resolve mobile header navigation overflow

The mobile navigation menu was overflowing on devices
with viewport width < 375px

Closes LR-124

test(farms): add integration tests for farm discovery

Covers search functionality and pagination

Closes LR-125
```

## Testing Strategy

### Unit Tests
- **Location**: `__tests__` directories alongside source files
- **Framework**: Vitest for speed and TypeScript support
- **Coverage**: >80% for utilities, services, and business logic
- **Mocking**: Mock external dependencies and API calls

### Integration Tests
- **API Tests**: Test full request/response cycle
- **Database Tests**: Use test database with realistic data
- **Authentication**: Test protected endpoints
- **Error Handling**: Test error scenarios and edge cases

### Component Tests
- **Framework**: React Testing Library
- **Focus**: User interactions and accessibility
- **Coverage**: All interactive components and forms
- **Mocking**: Mock API calls and external services

### End-to-End Tests
- **Framework**: Playwright (when implemented)
- **Coverage**: Critical user journeys
- **Environment**: Staging environment
- **Schedule**: Run before production deployments

## Deployment Process

### Staging Deployment
1. **Trigger**: Automatic on merge to `main`
2. **Environment**: staging.local-roots-mvp.vercel.app
3. **Testing**: Manual functional testing required
4. **Approval**: Engineering Manager approval for production

### Production Deployment
1. **Trigger**: Manual approval after staging verification
2. **Environment**: local-roots-mvp.vercel.app
3. **Monitoring**: Error tracking and performance monitoring
4. **Rollback**: Immediate rollback capability if issues detected

### Monitoring & Alerting
- **Error Tracking**: Sentry for JavaScript errors
- **Performance**: Vercel Analytics and Core Web Vitals
- **Uptime**: StatusPage for service status
- **Notifications**: Slack alerts for critical issues

## Security Guidelines

### Authentication
- Always use Clerk for user management
- Never store passwords or sensitive data locally
- Implement proper session management
- Use HTTPS in all environments

### Data Protection
- Sanitize all user inputs
- Use parameterized queries (Drizzle ORM handles this)
- Implement proper CORS policies
- Never log sensitive information

### API Security
- Rate limiting on public endpoints
- Input validation with Zod schemas
- Authentication middleware on protected routes
- Proper error handling (don't expose internals)

## Performance Guidelines

### Frontend Performance
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Bundle Size**: Monitor and optimize JavaScript bundles
- **Images**: Optimize with Next.js Image component
- **Caching**: Implement proper caching strategies

### Backend Performance
- **Response Times**: API endpoints <200ms average
- **Database**: Optimize queries and implement indexing
- **Caching**: Redis for frequently accessed data (future)
- **Monitoring**: Track response times and error rates

### Mobile Performance
- **Mobile-First**: Design and test mobile experience first
- **Touch Interactions**: Proper touch targets and gestures
- **Network**: Optimize for slower mobile connections
- **Battery**: Minimize CPU-intensive operations

## Documentation Requirements

### Code Documentation
- **Complex Logic**: Document non-obvious code decisions
- **API Documentation**: OpenAPI specs for all endpoints
- **Component Props**: TypeScript interfaces with JSDoc
- **README Updates**: Keep project README current

### Architecture Decisions
- **ADR Format**: Document significant technical decisions
- **Trade-offs**: Explain alternatives considered
- **Impact**: Describe effects on performance, security, maintainability

## Incident Response

### Severity Levels
- **P0 - Critical**: Complete service outage, data loss
- **P1 - High**: Major feature broken, security vulnerability
- **P2 - Medium**: Minor feature broken, performance degradation
- **P3 - Low**: Cosmetic issues, enhancement requests

### Response Process
1. **Detection**: Monitoring alerts or user reports
2. **Assessment**: Determine severity and impact
3. **Communication**: Notify team via Slack
4. **Resolution**: Fix issue with appropriate urgency
5. **Post-mortem**: Document learnings for P0/P1 incidents
