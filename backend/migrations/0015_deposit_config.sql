-- +goose Up
alter table subscription_plans add column if not exists deposit_cents int not null default 0;
alter table orders add column if not exists deposit_cents int not null default 0;

-- +goose Down
alter table orders drop column if exists deposit_cents;
alter table subscription_plans drop column if exists deposit_cents;
