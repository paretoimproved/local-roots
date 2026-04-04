-- +goose Up

-- Subscriptions: store Stripe customer + default payment method for off-session auth.
alter table subscriptions add column if not exists stripe_customer_id text;
alter table subscriptions add column if not exists stripe_payment_method_id text;

-- Orders: expand payment method/status for card authorization + capture.
alter table orders add column if not exists stripe_payment_intent_id text;

alter table orders drop constraint if exists orders_payment_method_chk;
alter table orders
  add constraint orders_payment_method_chk
  check (payment_method in ('pay_at_pickup', 'card'));

alter table orders drop constraint if exists orders_payment_status_chk;
alter table orders
  add constraint orders_payment_status_chk
  check (payment_status in ('unpaid', 'authorized', 'paid', 'voided', 'refunded', 'failed', 'requires_action'));

create unique index if not exists orders_stripe_payment_intent_uniq
  on orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists subscriptions_stripe_customer_id_idx
  on subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

-- +goose Down

drop index if exists subscriptions_stripe_customer_id_idx;
drop index if exists orders_stripe_payment_intent_uniq;

alter table orders drop constraint if exists orders_payment_status_chk;
alter table orders
  add constraint orders_payment_status_chk
  check (payment_status in ('unpaid', 'paid', 'refunded'));

alter table orders drop constraint if exists orders_payment_method_chk;
alter table orders
  add constraint orders_payment_method_chk
  check (payment_method in ('pay_at_pickup'));

alter table orders drop column if exists stripe_payment_intent_id;

alter table subscriptions drop column if exists stripe_payment_method_id;
alter table subscriptions drop column if exists stripe_customer_id;

