-- +goose Up
create extension if not exists pgcrypto;

-- +goose StatementBegin
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- +goose StatementEnd

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_chk check (role in ('buyer', 'seller', 'admin'))
);

create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references users(id) on delete cascade,
  name text not null,
  description text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stores_set_updated_at
before update on stores
for each row execute function set_updated_at();

create index stores_owner_user_id_idx on stores(owner_user_id);

create table pickup_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  label text,
  address1 text not null,
  address2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null default 'US',
  lat double precision,
  lng double precision,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pickup_locations_set_updated_at
before update on pickup_locations
for each row execute function set_updated_at();

create index pickup_locations_store_id_idx on pickup_locations(store_id);

create table pickup_windows (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  pickup_location_id uuid not null references pickup_locations(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  cutoff_at timestamptz not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_windows_time_chk check (cutoff_at < start_at and start_at < end_at),
  constraint pickup_windows_status_chk check (status in ('draft', 'published', 'canceled', 'completed')),
  constraint pickup_windows_store_location_chk check (store_id is not null and pickup_location_id is not null)
);

create unique index pickup_windows_id_store_id_uniq on pickup_windows(id, store_id);
create index pickup_windows_store_id_start_at_idx on pickup_windows(store_id, start_at);
create index pickup_windows_store_id_status_start_at_idx on pickup_windows(store_id, status, start_at);
create index pickup_windows_pickup_location_id_idx on pickup_windows(pickup_location_id);

create trigger pickup_windows_set_updated_at
before update on pickup_windows
for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  title text not null,
  description text,
  unit text not null,
  is_perishable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_id_store_id_uniq on products(id, store_id);
create index products_store_id_is_active_idx on products(store_id, is_active);

create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on product_images(product_id);

create table offerings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  pickup_window_id uuid not null,
  product_id uuid not null,
  price_cents int not null,
  quantity_available int not null,
  quantity_reserved int not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offerings_price_chk check (price_cents >= 0),
  constraint offerings_qty_chk check (quantity_available >= 0 and quantity_reserved >= 0),
  constraint offerings_status_chk check (status in ('active', 'sold_out', 'hidden')),
  constraint offerings_product_fk foreign key (product_id, store_id) references products(id, store_id) on delete cascade,
  constraint offerings_pickup_window_fk foreign key (pickup_window_id, store_id) references pickup_windows(id, store_id) on delete cascade
);

create index offerings_pickup_window_id_idx on offerings(pickup_window_id);
create index offerings_store_id_pickup_window_id_idx on offerings(store_id, pickup_window_id);
create index offerings_product_id_idx on offerings(product_id);

create trigger offerings_set_updated_at
before update on offerings
for each row execute function set_updated_at();

-- +goose Down
drop table if exists offerings;
drop table if exists product_images;
drop table if exists products;
drop table if exists pickup_windows;
drop table if exists pickup_locations;
drop table if exists stores;
drop table if exists users;
drop function if exists set_updated_at();
