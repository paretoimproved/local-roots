-- +goose Up
alter table users add column if not exists password_hash text;

-- Case-insensitive lookup/uniqueness (the app stores emails lowercased).
create unique index if not exists users_email_lower_uniq on users (lower(email));

-- +goose Down
drop index if exists users_email_lower_uniq;
alter table users drop column if exists password_hash;

