-- +goose Up
alter table pickup_locations add column if not exists instructions text;

-- +goose Down
alter table pickup_locations drop column if exists instructions;
