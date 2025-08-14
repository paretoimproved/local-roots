# Database Package

## Overview
Shared database schema, types, and utilities for the Local-Roots platform using Drizzle ORM with PostgreSQL.

## Linear Workflow Reminder
**Always update Linear tickets when making database changes:**
- Schema changes require review before implementation
- Migration scripts need testing in staging first
- Update ticket status: Backlog → In Progress → In Review → Done

## Schema Structure

### Core Tables

#### users
- Managed by Clerk authentication
- Links to farms and subscriptions
- Stores user type (farmer/consumer)

#### farms
```typescript
{
  id: string (primary key)
  userId: string (foreign key)
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  latitude?: string
  longitude?: string
  imageUrls?: string[]
  createdAt: Date
  updatedAt: Date
}
```

#### csa_shares
```typescript
{
  id: string (primary key)
  farmId: string (foreign key)
  name: string
  description?: string
  price: number (cents)
  frequency: 'weekly' | 'biweekly' | 'monthly'
  available: boolean
  startDate?: Date
  endDate?: Date
  maxSubscribers?: number
  currentSubscribers: number
  createdAt: Date
  updatedAt: Date
}
```

#### subscriptions
```typescript
{
  id: string (primary key)
  userId: string (foreign key)
  shareId: string (foreign key)
  status: 'active' | 'paused' | 'cancelled'
  startDate: Date
  nextDeliveryDate?: Date
  createdAt: Date
  updatedAt: Date
}
```

## Database Indexes

### Performance Indexes
```sql
-- Cursor pagination for farms
CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC);

-- Search optimization
CREATE INDEX farms_search_idx ON farms 
USING GIN(to_tsvector('english', name || ' ' || description));

-- User lookups
CREATE INDEX farms_user_idx ON farms (user_id);
CREATE INDEX subscriptions_user_idx ON subscriptions (user_id);

-- Share lookups
CREATE INDEX shares_farm_idx ON csa_shares (farm_id);
```

## Migrations

### Migration Strategy
1. Create migration file in `migrations/`
2. Test locally with development database
3. Review migration in PR
4. Test in staging environment
5. Apply to production after approval

### Migration Naming
```
001_initial_schema.sql
002_add_farms_indexes.sql
003_add_search_capability.sql
```

### Rollback Strategy
- Each migration should have a rollback script
- Test rollback procedures in staging
- Document dependencies between migrations

## Type Safety

### Generated Types
```typescript
// Automatically generated from schema
export type Farm = InferSelectModel<typeof farms>
export type NewFarm = InferInsertModel<typeof farms>
```

### Zod Validation
```typescript
// Automatic validation schemas
export const farmInsertSchema = createInsertSchema(farms)
export const farmSelectSchema = createSelectSchema(farms)
```

## Database Connection

### Connection Pooling
```typescript
const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, {
  max: 10, // connection pool size
  idle_timeout: 20,
  connect_timeout: 10
})
```

### Environment Configuration
```env
# Development
DATABASE_URL=postgresql://dev:dev@localhost:5432/localroots_dev

# Staging
DATABASE_URL=postgresql://user:pass@staging.db.com:5432/localroots_staging

# Production
DATABASE_URL=postgresql://user:pass@prod.db.com:5432/localroots_prod
```

## Query Patterns

### Cursor Pagination
```typescript
const query = db
  .select()
  .from(farms)
  .orderBy(desc(farms.createdAt), desc(farms.id))
  .limit(limit + 1)
  .where(cursor ? and(...) : undefined);
```

### Search Queries
```typescript
const searchResults = db
  .select()
  .from(farms)
  .where(
    or(
      ilike(farms.name, `%${search}%`),
      ilike(farms.description, `%${search}%`)
    )
  );
```

### Joins
```typescript
const farmsWithShares = db
  .select()
  .from(farms)
  .leftJoin(csaShares, eq(farms.id, csaShares.farmId));
```

## Performance Optimization

### Query Optimization
- Use indexes for frequent queries
- Avoid N+1 queries with proper joins
- Limit result sets with pagination
- Use query explain plans for analysis

### Connection Management
- Connection pooling for concurrent requests
- Proper connection cleanup
- Transaction management for consistency
- Read replicas for scaling (future)

## Testing

### Test Database
- Separate test database for isolation
- Automatic cleanup after tests
- Seed data for consistent testing
- Migration testing before deployment

### Test Utilities
```typescript
// Reset database for tests
export async function resetDatabase() {
  await db.delete(subscriptions);
  await db.delete(csaShares);
  await db.delete(farms);
  await db.delete(users);
}
```

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Geographic redundancy
- Regular restore testing

### Disaster Recovery
- RTO: 4 hours
- RPO: 1 hour
- Documented recovery procedures
- Regular DR drills

## Monitoring

### Metrics to Track
- Query performance (p50, p95, p99)
- Connection pool utilization
- Slow query log analysis
- Database size and growth
- Index usage statistics

### Alerting
- Slow queries > 1s
- Connection pool exhaustion
- Failed migrations
- Disk space warnings

## Security

### Best Practices
- Parameterized queries (SQL injection prevention)
- Least privilege access
- Encrypted connections (SSL/TLS)
- Regular security updates
- Audit logging

### Access Control
- Application user with limited permissions
- Read-only replicas for analytics
- Separate credentials per environment
- Regular credential rotation

## Future Enhancements
- Full-text search with PostgreSQL
- Geographic queries with PostGIS
- Time-series data for analytics
- Partitioning for large tables
- Read replicas for scaling

## Dependencies
- `drizzle-orm`: ORM and query builder
- `postgres`: PostgreSQL client
- `drizzle-zod`: Schema validation
- `zod`: Runtime validation

## Team Ownership
- **Database Lead:** Jordan Kim
- **Schema Design:** Engineering Team
- **Migrations:** Jordan Kim
- **Performance:** Sam Rodriguez

**Last Updated:** August 14, 2025
**Version:** 1.0.0