-- +goose Up
alter table orders add column if not exists reminder_sent_at timestamptz;

-- +goose Down
alter table orders drop column if exists reminder_sent_at;
