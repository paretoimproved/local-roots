# Local-Roots API Server

## Current Status: Sprint 1 Implementation Complete ✅

### API Features Implemented

#### Farm Management Endpoints
- **GET /api/farms** - List farms with cursor pagination and search
- **GET /api/farms/:id** - Get individual farm details
- **POST /api/farms** - Create new farm (authenticated)
- **PUT /api/farms/:id** - Update farm (authenticated)
- **DELETE /api/farms/:id** - Delete farm (authenticated)

#### Search & Pagination
- **Cursor-based pagination:** Efficient for large datasets
- **Search functionality:** ILIKE pattern matching on name and description
- **Database indexing:** Optimized queries with proper indexes
- **Response format:** Consistent with `{ data, nextCursor, hasMore }` structure

### Technical Stack

#### Runtime & Framework
```typescript
// Core Dependencies
"hono": "^4.0.0"           // Web framework (updated from v3)
"@hono/node-server": "^1.3.3"
"@hono/zod-validator": "^0.1.11"

// Database
"@repo/db": "workspace:*"   // Shared database package
"drizzle-orm": "^0.28.6"
"postgres": "^3.4.3"

// Authentication
"@clerk/backend": "^1.25.5"
"@clerk/clerk-sdk-node": "^4.12.16"
```

#### Database Schema
```sql
-- Farms table with cursor pagination index
CREATE TABLE farms (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  image_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC);
CREATE INDEX farms_search_idx ON farms USING GIN(to_tsvector('english', name || ' ' || description));
```

### API Endpoints Documentation

#### Farms API

##### List Farms with Pagination & Search
```http
GET /api/farms?cursor=<base64>&limit=20&search=<term>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "clerk_user_id", 
      "name": "Farm Name",
      "description": "Farm description",
      "address": "123 Farm St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "latitude": "40.7128",
      "longitude": "-74.0060",
      "imageUrls": ["https://cloudinary.com/..."],
      "createdAt": "2025-08-14T...",
      "updatedAt": "2025-08-14T..."
    }
  ],
  "nextCursor": "base64_encoded_cursor",
  "hasMore": true
}
```

##### Get Single Farm
```http
GET /api/farms/:id

Response:
{
  "success": true,
  "farm": { /* farm object */ },
  "csaShares": [
    {
      "id": "uuid",
      "farmId": "farm_uuid",
      "name": "Weekly Veggie Box",
      "description": "Fresh seasonal vegetables",
      "price": 45.00,
      "frequency": "weekly",
      "available": true,
      "startDate": "2025-06-01",
      "endDate": "2025-11-30"
    }
  ],
  "images": ["https://cloudinary.com/..."]
}
```

#### Error Handling
```typescript
// Standard error responses
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}

// HTTP Status Codes
200 - Success
400 - Bad Request (invalid cursor, validation errors)
401 - Unauthorized (missing/invalid auth)
404 - Not Found (farm doesn't exist)
422 - Validation Error (invalid data)
500 - Internal Server Error
```

### Authentication Integration

#### Clerk Integration
```typescript
// Middleware for protected routes
import { ClerkAuth } from '@clerk/backend'

// Protected endpoint example
app.get('/api/farms/user/me', ClerkAuth(), async (c) => {
  const userId = c.get('userId')
  // Return user's farms
})
```

#### Authentication Flow
1. **Public endpoints:** GET /api/farms (list/search)
2. **Protected endpoints:** POST/PUT/DELETE require Clerk authentication
3. **User context:** Available in protected routes via `c.get('userId')`

### Development Setup

#### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production  
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
```

#### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/localroots

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...

# Server Configuration
PORT=3004
NODE_ENV=development
```

### Testing Strategy

#### Unit Tests (Implemented)
```typescript
// Test files: *.test.ts
"vitest": "^2.1.8"
"supertest": "^7.0.0"

// Example test coverage
farms.service.test.ts - Business logic tests
farms.routes.test.ts - Endpoint integration tests
```

#### API Testing
```bash
# Run all tests
pnpm test

# Test coverage
pnpm test:coverage

# Test UI
pnpm test:ui
```

### Deployment Status

#### Current Deployment
- **Status:** Not yet deployed (API deployment pending)
- **Target Platform:** Railway/Render for API hosting
- **Database:** PostgreSQL (Supabase recommended)
- **Environment:** Production environment setup needed

#### Deployment Requirements
1. **Database setup:** PostgreSQL with schema migration
2. **Environment variables:** Clerk keys, database URL
3. **Hosting platform:** Railway, Render, or similar
4. **Domain configuration:** API subdomain setup

### Sprint 1 Achievements

#### ✅ Completed Features
- **Cursor pagination system** with database indexing
- **Search functionality** with ILIKE pattern matching  
- **RESTful API design** with consistent response format
- **Authentication middleware** with Clerk integration
- **Error handling** with proper HTTP status codes
- **Database schema** optimized for performance
- **Unit test coverage** for core functionality

#### 🔄 Integration Status
- **Frontend integration:** Web app successfully consumes API
- **Database:** Schema deployed and seeded
- **Authentication:** Clerk middleware implemented
- **Validation:** Zod schemas for request/response validation

### Next Steps (Post-Sprint 1)

#### Immediate Deployment Tasks
- [ ] Deploy API to production hosting platform
- [ ] Configure production database with migrations
- [ ] Set up environment variables in hosting platform
- [ ] Configure CORS for web app domain
- [ ] Set up API monitoring and logging

#### Sprint 2 API Enhancements
- [ ] CSA share management endpoints
- [ ] Subscription management system
- [ ] File upload for farm images
- [ ] Advanced search filters (location radius, farm type)
- [ ] Real-time notifications
- [ ] API rate limiting
- [ ] Enhanced error tracking

### Performance Optimizations

#### Database Performance
- **Indexes:** Cursor pagination and search indexes implemented
- **Query optimization:** Efficient joins and filtering
- **Connection pooling:** Configured for production load

#### API Performance
- **Response caching:** Ready for Redis integration
- **Compression:** Gzip compression enabled
- **Validation:** Efficient Zod schema validation
- **Error handling:** Minimal overhead error responses

### Security Considerations

#### Authentication & Authorization
- **Clerk integration:** Industry-standard authentication
- **JWT validation:** Automatic token verification
- **User context:** Secure user identification in protected routes
- **CORS configuration:** Restricted to allowed origins

#### Data Protection
- **Input validation:** Zod schemas prevent injection
- **SQL injection protection:** Drizzle ORM parameterized queries
- **Rate limiting:** Ready for implementation
- **Environment secrets:** Secure environment variable handling

---

**Last Updated:** August 14, 2025  
**Status:** Implementation complete, pending production deployment
**Next Milestone:** API deployment and frontend integration testing