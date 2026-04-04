-- +goose Up

alter table orders add column if not exists captured_cents int not null default 0;
-- Goose runs migrations statement-by-statement; avoid DO blocks here.
alter table orders drop constraint if exists orders_captured_cents_chk;
alter table orders add constraint orders_captured_cents_chk check (captured_cents >= 0);

-- +goose Down

alter table orders drop constraint if exists orders_captured_cents_chk;
alter table orders drop column if exists captured_cents;
