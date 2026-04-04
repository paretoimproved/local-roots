-- +goose Up
create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  pickup_window_id uuid not null,
  buyer_email text not null,
  buyer_name text,
  buyer_phone text,
  status text not null default 'placed',
  payment_method text not null default 'pay_at_pickup',
  payment_status text not null default 'unpaid',
  subtotal_cents int not null default 0,
  total_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_chk check (status in ('placed', 'canceled', 'ready', 'picked_up', 'no_show', 'refunded')),
  constraint orders_payment_method_chk check (payment_method in ('pay_at_pickup')),
  constraint orders_payment_status_chk check (payment_status in ('unpaid', 'paid', 'refunded')),
  constraint orders_pickup_window_fk foreign key (pickup_window_id, store_id) references pickup_windows(id, store_id) on delete cascade
);

create index orders_store_id_created_at_idx on orders(store_id, created_at desc);
create index orders_pickup_window_id_created_at_idx on orders(pickup_window_id, created_at desc);

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  offering_id uuid,
  product_title text not null,
  product_unit text not null,
  price_cents int not null,
  quantity int not null,
  line_total_cents int not null,
  created_at timestamptz not null default now(),
  constraint order_items_qty_chk check (quantity > 0),
  constraint order_items_price_chk check (price_cents >= 0),
  constraint order_items_line_total_chk check (line_total_cents >= 0)
);

create index order_items_order_id_idx on order_items(order_id);

-- +goose Down
drop table if exists order_items;
drop table if exists orders;

