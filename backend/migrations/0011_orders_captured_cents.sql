-- +goose Up

alter table orders add column if not exists captured_cents int not null default 0;
-- Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS, so use a guarded DO block.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where c.conname = 'orders_captured_cents_chk'
      and t.relname = 'orders'
  ) then
    alter table orders
      add constraint orders_captured_cents_chk check (captured_cents >= 0);
  end if;
end $$;

-- +goose Down

alter table orders drop constraint if exists orders_captured_cents_chk;
alter table orders drop column if exists captured_cents;
