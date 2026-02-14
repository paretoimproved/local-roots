-- +goose Up

alter table orders add column if not exists pickup_code text;

-- Backfill existing rows (random() must be evaluated per-row).
update orders
set pickup_code = lpad((floor(random() * 1000000))::int::text, 6, '0')
where pickup_code is null or pickup_code = '';

alter table orders alter column pickup_code set not null;
alter table orders alter column pickup_code set default lpad((floor(random() * 1000000))::int::text, 6, '0');

alter table orders
  add constraint orders_pickup_code_chk check (pickup_code ~ '^[0-9]{6}$');

-- +goose Down

alter table orders drop constraint if exists orders_pickup_code_chk;
alter table orders drop column if exists pickup_code;

