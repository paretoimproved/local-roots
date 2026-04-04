-- +goose Up
alter table stores add column is_demo boolean not null default false;

-- +goose Down
alter table stores drop column if exists is_demo;
