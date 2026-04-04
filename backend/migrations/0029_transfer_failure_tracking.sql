-- +goose Up
ALTER TABLE orders ADD COLUMN transfer_attempted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN transfer_error TEXT;
ALTER TABLE orders ADD COLUMN transfer_retry_count INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE orders DROP COLUMN transfer_retry_count;
ALTER TABLE orders DROP COLUMN transfer_error;
ALTER TABLE orders DROP COLUMN transfer_attempted_at;
