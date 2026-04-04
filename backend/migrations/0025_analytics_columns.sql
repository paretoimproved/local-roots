-- +goose Up
ALTER TABLE subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN cancel_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN paused_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE orders DROP COLUMN picked_up_at;
ALTER TABLE subscriptions DROP COLUMN paused_at;
ALTER TABLE subscriptions DROP COLUMN cancel_reason;
ALTER TABLE subscriptions DROP COLUMN canceled_at;
