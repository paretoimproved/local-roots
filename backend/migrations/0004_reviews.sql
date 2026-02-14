-- +goose Up
alter table orders add column if not exists buyer_token text not null default gen_random_uuid()::text;
create unique index if not exists orders_buyer_token_uniq on orders(buyer_token);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  rating int not null,
  body text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_chk check (rating >= 1 and rating <= 5)
);

create index reviews_store_id_created_at_idx on reviews(store_id, created_at desc);

-- +goose Down
drop table if exists reviews;
drop index if exists orders_buyer_token_uniq;
alter table orders drop column if exists buyer_token;

