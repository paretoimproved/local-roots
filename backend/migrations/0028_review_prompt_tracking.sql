-- +goose Up
ALTER TABLE orders ADD COLUMN review_prompt_sent_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE orders DROP COLUMN review_prompt_sent_at;
