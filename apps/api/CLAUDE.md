# Local-Roots API Service

## Overview
RESTful API service for the Local-Roots CSA marketplace platform, built with Hono framework on Bun runtime for high performance.

## Architecture

### Tech Stack
- **Runtime:** Bun (for speed and native TypeScript)
- **Framework:** Hono (lightweight, fast)
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod schemas
- **Authentication:** Clerk

### Project Structure
```
apps/api/
├── src/
│   ├── index.ts           # Application entry point
│   ├── modules/           # Feature modules
│   │   ├── farms/         # Farm management
│   │   └── shares/        # CSA share management
│   ├── pkg/              # Shared packages
│   │   └── middleware/   # Auth, CORS, etc.
│   └── test/            # Test utilities
```

## Core Modules

### Farms Module
- CRUD operations for farm management
- Cursor-based pagination for scalability
- Search functionality with ILIKE queries
- Public and protected endpoints

### Shares Module  
- CSA share management
- Pricing and availability
- Subscription tracking
- Farm-share relationships

## API Conventions

### Response Format
```json
{
  "success": boolean,
  "data": any,
  "error": string | null,
  "meta": {
    "nextCursor": string | null,
    "hasMore": boolean
  }
}
```

### Error Handling
- Consistent HTTP status codes
- Structured error messages
- Client-friendly error descriptions
- Retry guidance for transient failures

### Authentication
- Clerk JWT validation
- Protected route middleware
- User context injection
- Role-based access control

## Database Design

### Schema Management
- Drizzle ORM for type safety
- Migration system for schema changes
- Composite indexes for performance
- Proper foreign key constraints

### Performance Optimizations
- Cursor pagination indexes
- Search query optimization
- Connection pooling
- Query result caching strategy

## Testing Strategy

### Unit Tests
- Service layer logic
- Utility functions
- Middleware behavior
- Error handling

### Integration Tests
- API endpoint testing
- Database interactions
- Authentication flows
- Error scenarios

## Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
```

## API Documentation

### Base URL
- Development: `http://localhost:3004`
- Staging: `https://api-staging.local-roots.com`
- Production: `https://api.local-roots.com`

### Available Endpoints

#### Farms
- `GET /api/farms` - List farms (paginated)
- `GET /api/farms/:id` - Get farm details
- `POST /api/farms` - Create farm (auth required)
- `PUT /api/farms/:id` - Update farm (owner only)
- `DELETE /api/farms/:id` - Delete farm (owner only)

#### Shares
- `GET /api/shares` - List shares
- `GET /api/shares/:id` - Get share details
- `POST /api/shares` - Create share (auth required)
- `PUT /api/shares/:id` - Update share (owner only)
- `DELETE /api/shares/:id` - Delete share (owner only)

## Performance Metrics

### Target Benchmarks
- Response time: < 100ms (p95)
- Throughput: 1000 req/s
- Error rate: < 0.1%
- Uptime: 99.9%

### Monitoring
- Request/response logging
- Error tracking
- Performance metrics
- Database query analysis

## Security Considerations

### Best Practices
- Input validation with Zod
- SQL injection prevention
- Rate limiting per endpoint
- CORS configuration
- Security headers

### Authentication Flow
1. Client sends request with JWT
2. Middleware validates token
3. User context extracted
4. Request processed with user scope
5. Response sent with appropriate data

## Deployment

### CI/CD Pipeline
- GitHub Actions for testing
- Automated type checking
- Linting and formatting
- Build verification
- Deployment to staging/production

### Infrastructure
- Containerized deployment
- Health check endpoints
- Graceful shutdown handling
- Environment-based configuration

## Future Enhancements
- GraphQL API option
- WebSocket support for real-time
- Advanced caching strategies
- API versioning system
- OpenAPI documentation
- Rate limiting implementation

## Related Services
- Frontend: Next.js application
- Database: PostgreSQL
- Authentication: Clerk
- File Storage: Cloudinary

## Team Ownership
- **Backend Lead:** Jordan Kim
- **API Design:** Engineering Team
- **Database:** Jordan Kim
- **DevOps:** Sam Rodriguez

**Last Updated:** August 14, 2025
**Version:** 1.0.0