# Local-Roots Database Package

## Database Schema & Configuration

### Current Status: Sprint 1 Schema Complete ✅

This package contains the shared database schema, types, and utilities used across the Local-Roots platform.

### Technology Stack

#### ORM & Database Tools
```typescript
// Core Dependencies
"drizzle-orm": "^0.28.6"     // Type-safe ORM
"postgres": "^3.4.3"         // PostgreSQL driver
"drizzle-zod": "^0.5.1"      // Zod integration for validation

// Development Tools  
"drizzle-kit": "^0.19.13"    // Schema management & migrations
"@types/pg": "^8.10.9"       // TypeScript definitions
"dotenv": "^16.3.1"          // Environment configuration
"zod": "^3.22.4"             // Schema validation
```

### Database Schema

#### Core Tables

##### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL,
  name VARCHAR,
  user_type VARCHAR CHECK (user_type IN ('farmer', 'consumer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX users_clerk_idx ON users (clerk_id);
```

##### Farms Table  
```sql
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL, -- Clerk user ID
  name VARCHAR NOT NULL,
  description TEXT,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT farms_user_fk FOREIGN KEY (user_id) REFERENCES users(clerk_id)
);

-- Performance indexes for Sprint 1 features
CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC);
CREATE INDEX farms_search_idx ON farms USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX farms_location_idx ON farms (latitude, longitude);
CREATE INDEX farms_user_idx ON farms (user_id);
```

##### CSA Shares Table
```sql
CREATE TABLE csa_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  available BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  max_subscribers INTEGER,
  current_subscribers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT shares_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX shares_farm_idx ON csa_shares (farm_id);
CREATE INDEX shares_available_idx ON csa_shares (available, start_date);
```

##### Subscriptions Table (Future - Sprint 2)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  share_id UUID NOT NULL,
  status VARCHAR CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_delivery DATE,
  delivery_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(clerk_id),
  CONSTRAINT subscriptions_share_fk FOREIGN KEY (share_id) REFERENCES csa_shares(id)
);

CREATE INDEX subscriptions_user_idx ON subscriptions (user_id);
CREATE INDEX subscriptions_share_idx ON subscriptions (share_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status, next_delivery);
```

### Drizzle Schema Definition

#### Core Schema File
```typescript
// src/schema.ts
import { pgTable, uuid, varchar, text, timestamp, decimal, boolean, integer, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id').unique().notNull(),
  email: varchar('email').notNull(),
  name: varchar('name'),
  userType: varchar('user_type').$type<'farmer' | 'consumer'>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const farms = pgTable('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  address: varchar('address'),
  city: varchar('city'),
  state: varchar('state'),
  zipCode: varchar('zip_code'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  imageUrls: text('image_urls').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const csaShares = pgTable('csa_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  frequency: varchar('frequency').$type<'weekly' | 'biweekly' | 'monthly'>(),
  available: boolean('available').default(true),
  startDate: date('start_date'),
  endDate: date('end_date'),
  maxSubscribers: integer('max_subscribers'),
  currentSubscribers: integer('current_subscribers').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

#### TypeScript Types
```typescript
// src/types.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, farms, csaShares } from './schema';

// Select types (for reading from database)
export type User = InferSelectModel<typeof users>;
export type Farm = InferSelectModel<typeof farms>;
export type CSAShare = InferSelectModel<typeof csaShares>;

// Insert types (for creating new records)
export type NewUser = InferInsertModel<typeof users>;
export type NewFarm = InferInsertModel<typeof farms>;
export type NewCSAShare = InferInsertModel<typeof csaShares>;

// API response types
export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
};
```

### Database Operations

#### Connection & Configuration
```typescript
// src/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from './schema';
export * from './types';
```

#### Migration Scripts
```bash
# Package.json scripts
"db:generate": "drizzle-kit generate:pg"    # Generate migration files
"db:push": "drizzle-kit push:pg"            # Push schema to database
"db:migrate": "drizzle-kit migrate:pg"      # Run migrations  
"db:studio": "drizzle-kit studio"           # Open Drizzle Studio
"db:seed": "bun ./src/seed.ts"              # Seed development data
```

### Development Utilities

#### Seed Data Script
```typescript
// src/seed.ts
import { db } from './index';
import { farms, csaShares } from './schema';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  // Insert sample farms
  const sampleFarms = await db.insert(farms).values([
    {
      userId: 'user_sample1',
      name: 'Green Valley Farm',
      description: 'Organic vegetables and fruits in the heart of the valley',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      imageUrls: ['https://cloudinary.com/sample1.jpg']
    },
    {
      userId: 'user_sample2', 
      name: 'Sunset Ridge Organics',
      description: 'Sustainable farming practices with seasonal produce',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      imageUrls: ['https://cloudinary.com/sample2.jpg']
    }
  ]).returning();

  // Insert sample CSA shares
  for (const farm of sampleFarms) {
    await db.insert(csaShares).values([
      {
        farmId: farm.id,
        name: 'Weekly Veggie Box',
        description: 'Fresh seasonal vegetables delivered weekly',
        price: '45.00',
        frequency: 'weekly',
        startDate: '2025-06-01',
        endDate: '2025-11-30'
      }
    ]);
  }
  
  console.log('✅ Database seeded successfully');
}
```

### Environment Configuration

#### Required Environment Variables
```bash
# packages/db/.env
DATABASE_URL=postgresql://username:password@localhost:5432/localroots

# For production
DATABASE_URL=postgresql://user:pass@db.railway.app:5432/railway
```

#### Drizzle Configuration
```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Sprint 1 Database Features

#### ✅ Implemented Features
- **Cursor pagination support** with proper indexing
- **Full-text search capability** using GIN indexes
- **Type-safe schema** with Drizzle ORM
- **Migration system** for schema changes
- **Seed data scripts** for development
- **Performance optimization** with strategic indexes

#### 🔄 Current Usage
- **API integration:** Used by apps/api for all farm operations
- **Type safety:** Shared types across frontend and backend
- **Development workflow:** Migrations and seeding automated

### Performance Considerations

#### Indexing Strategy
```sql
-- Cursor pagination (used in farm listing)
CREATE INDEX farms_cursor_idx ON farms (created_at DESC, id DESC);

-- Search functionality (ILIKE pattern matching)
CREATE INDEX farms_search_idx ON farms USING GIN(to_tsvector('english', name || ' ' || description));

-- Geospatial queries (future location-based search)
CREATE INDEX farms_location_idx ON farms (latitude, longitude);

-- User queries (farm ownership)
CREATE INDEX farms_user_idx ON farms (user_id);
```

#### Query Performance
- **Cursor pagination:** O(log n) performance for large datasets
- **Search queries:** GIN index enables fast text search
- **Joins:** Optimized foreign key relationships
- **Connection pooling:** Configured for production load

### Next Steps (Sprint 2)

#### Schema Enhancements
- [ ] Subscription management tables
- [ ] Payment tracking integration
- [ ] Farm image metadata
- [ ] User preferences and settings
- [ ] Notification system tables

#### Performance Optimizations
- [ ] Query performance monitoring
- [ ] Index optimization based on usage patterns
- [ ] Read replicas for scaling
- [ ] Connection pool tuning

#### Data Migration
- [ ] Production database setup
- [ ] Backup and recovery procedures
- [ ] Data validation and integrity checks
- [ ] Performance baseline establishment

---

**Last Updated:** August 14, 2025  
**Status:** Sprint 1 schema complete and optimized  
**Next Milestone:** Production deployment and Sprint 2 schema enhancements