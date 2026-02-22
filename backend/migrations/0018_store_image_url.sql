-- +goose Up
alter table stores add column if not exists image_url text;

-- +goose Down
alter table stores drop column if exists image_url;
