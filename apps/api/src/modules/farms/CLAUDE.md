# Farms Module

## Overview
This module handles all farm-related API operations including CRUD operations and cursor-based pagination for the consumer farm discovery feature.

## API Endpoints

### Public Endpoints

#### GET /api/farms
Retrieves a paginated list of all farms.

**Query Parameters:**
- `cursor` (optional): Base64-encoded cursor for pagination
- `limit` (optional): Number of results per page (max: 50, default: 20)
- `search` (optional): Search term for filtering farms by name or description

**Response Format:**
```json
{
  "success": boolean,
  "data": Farm[],
  "nextCursor": string | null,
  "hasMore": boolean
}
```

#### GET /api/farms/:id
Retrieves detailed information about a specific farm.

**Response:** Single farm object with all details

### Protected Endpoints (Requires Authentication)

#### GET /api/farms/user/me
Retrieves all farms owned by the authenticated user.

#### POST /api/farms
Creates a new farm for the authenticated user.

#### PUT /api/farms/:id
Updates an existing farm (owner only).

#### DELETE /api/farms/:id
Deletes a farm (owner only).

## Technical Implementation

### Cursor Pagination
- Uses composite cursor: `(createdAt, id)`
- Base64 encoded for URL safety
- Efficient database queries with proper indexing
- Handles edge cases (invalid cursors, empty results)

### Search Implementation
- PostgreSQL ILIKE pattern matching
- Searches both farm name and description
- Case-insensitive matching
- Performance optimized with GIN indexes

### Database Indexes
```sql
-- Cursor pagination index
CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC);

-- Search performance index
CREATE INDEX farms_search_idx ON farms 
USING GIN(to_tsvector('english', name || ' ' || description));
```

## Error Handling
- 400: Invalid request parameters
- 401: Unauthorized (protected routes)
- 403: Forbidden (not farm owner)
- 404: Farm not found
- 500: Server errors with retry guidance

## Testing
- Unit tests: `farms.test.ts`
- Tests cursor encoding/decoding
- Tests pagination logic
- Validates error handling

## Performance Considerations
- Cursor pagination prevents offset performance issues
- Database indexes optimize query performance
- Limit parameter prevents excessive data transfer
- Caching opportunities for frequently accessed farms

## Security
- Authentication required for mutations
- Ownership validation for updates/deletes
- Input sanitization for search queries
- Rate limiting recommendations

## Future Enhancements
- Full-text search upgrade
- Geographic proximity search
- Farm categories and filtering
- Image upload integration
- Farm verification system

## Dependencies
- `@repo/db`: Database schema and client
- `hono`: Web framework
- `@hono/zod-validator`: Request validation
- `drizzle-orm`: Query building

## Related Modules
- `shares`: CSA share management
- `subscriptions`: User subscriptions
- `auth`: Authentication middleware

## Sprint 1 Implementation (LOC-6)
- Implemented cursor pagination
- Added search functionality
- Created database indexes
- Comprehensive error handling
- Performance optimized for scale

**Last Updated:** August 14, 2025
**Owner:** Jordan Kim (Backend)