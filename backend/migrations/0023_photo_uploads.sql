-- +goose Up
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE pickup_locations ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- +goose Down
ALTER TABLE pickup_locations DROP COLUMN IF EXISTS photo_url;
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS image_url;
