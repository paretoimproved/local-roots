-- +goose Up

create table magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index magic_link_tokens_email_idx on magic_link_tokens(email);

alter table orders add column if not exists buyer_user_id uuid references users(id) on delete set null;
alter table subscriptions add column if not exists buyer_user_id uuid references users(id) on delete set null;

create index orders_buyer_user_id_idx on orders(buyer_user_id) where buyer_user_id is not null;
create index subscriptions_buyer_user_id_idx on subscriptions(buyer_user_id) where buyer_user_id is not null;

-- +goose Down

drop index if exists subscriptions_buyer_user_id_idx;
drop index if exists orders_buyer_user_id_idx;
alter table subscriptions drop column if exists buyer_user_id;
alter table orders drop column if exists buyer_user_id;
drop table if exists magic_link_tokens;
