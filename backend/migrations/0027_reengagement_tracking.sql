-- +goose Up
ALTER TABLE subscriptions ADD COLUMN last_reengagement_email_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE subscriptions DROP COLUMN last_reengagement_email_at;
