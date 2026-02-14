-- +goose Up

alter table orders drop constraint if exists orders_payment_status_chk;
alter table orders
  add constraint orders_payment_status_chk
  check (payment_status in ('unpaid', 'pending', 'authorized', 'paid', 'voided', 'refunded', 'failed', 'requires_action'));

-- +goose Down

alter table orders drop constraint if exists orders_payment_status_chk;
alter table orders
  add constraint orders_payment_status_chk
  check (payment_status in ('unpaid', 'authorized', 'paid', 'voided', 'refunded', 'failed', 'requires_action'));

