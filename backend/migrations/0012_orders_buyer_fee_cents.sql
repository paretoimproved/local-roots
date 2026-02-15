-- +goose Up
alter table orders
add column buyer_fee_cents int not null default 0;

alter table orders
add constraint orders_buyer_fee_cents_chk check (buyer_fee_cents >= 0);

-- +goose Down
alter table orders drop constraint if exists orders_buyer_fee_cents_chk;
alter table orders drop column if exists buyer_fee_cents;

