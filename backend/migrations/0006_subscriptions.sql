-- +goose Up

create table subscription_plans (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  pickup_location_id uuid not null references pickup_locations(id) on delete cascade,
  product_id uuid not null,
  title text not null,
  description text,
  cadence text not null,
  price_cents int not null,
  subscriber_limit int not null,
  first_start_at timestamptz not null,
  duration_minutes int not null default 120,
  cutoff_hours int not null default 24,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_cadence_chk check (cadence in ('weekly', 'biweekly', 'monthly')),
  constraint subscription_plans_price_chk check (price_cents >= 0),
  constraint subscription_plans_subscriber_limit_chk check (subscriber_limit > 0),
  constraint subscription_plans_duration_chk check (duration_minutes > 0),
  constraint subscription_plans_cutoff_chk check (cutoff_hours >= 0),
  constraint subscription_plans_product_fk foreign key (product_id, store_id) references products(id, store_id) on delete cascade
);

create index subscription_plans_store_id_is_active_idx on subscription_plans(store_id, is_active);
create index subscription_plans_store_id_created_at_idx on subscription_plans(store_id, created_at desc);

create trigger subscription_plans_set_updated_at
before update on subscription_plans
for each row execute function set_updated_at();

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references subscription_plans(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  buyer_email text not null,
  buyer_name text,
  buyer_phone text,
  buyer_token text not null default gen_random_uuid()::text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_chk check (status in ('active', 'paused', 'canceled'))
);

create unique index subscriptions_buyer_token_uniq on subscriptions(buyer_token);
create index subscriptions_plan_id_status_created_at_idx on subscriptions(plan_id, status, created_at desc);

create trigger subscriptions_set_updated_at
before update on subscriptions
for each row execute function set_updated_at();

create table subscription_cycles (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references subscription_plans(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  pickup_window_id uuid not null,
  start_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint subscription_cycles_pickup_window_fk foreign key (pickup_window_id, store_id) references pickup_windows(id, store_id) on delete cascade
);

create unique index subscription_cycles_plan_start_at_uniq on subscription_cycles(plan_id, start_at);
create index subscription_cycles_plan_id_start_at_idx on subscription_cycles(plan_id, start_at desc);

alter table orders add column if not exists subscription_id uuid references subscriptions(id) on delete set null;
create unique index if not exists orders_subscription_pickup_window_uniq on orders(subscription_id, pickup_window_id) where subscription_id is not null;

-- +goose Down

drop index if exists orders_subscription_pickup_window_uniq;
alter table orders drop column if exists subscription_id;

drop table if exists subscription_cycles;
drop table if exists subscriptions;
drop table if exists subscription_plans;

