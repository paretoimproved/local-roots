-- +goose Up
alter table users add column email_marketing_opt_out boolean not null default false;

-- +goose Down
alter table users drop column if exists email_marketing_opt_out;
