-- +goose Up

alter table orders add column if not exists captured_cents int not null default 0;
alter table orders add constraint if not exists orders_captured_cents_chk check (captured_cents >= 0);

-- +goose Down

alter table orders drop constraint if exists orders_captured_cents_chk;
alter table orders drop column if exists captured_cents;

