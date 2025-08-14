-- Migration: Add cursor pagination index for farms
-- Date: 2025-08-14
-- Description: Adds composite index for efficient cursor-based pagination

-- Create index for cursor pagination (created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS farms_cursor_idx ON farms (created_at DESC, id DESC);

-- Add comment for documentation
COMMENT ON INDEX farms_cursor_idx IS 'Composite index for cursor-based pagination on farms table';