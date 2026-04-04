-- +goose Up

alter table stores add column if not exists stripe_account_id text;
alter table stores add column if not exists stripe_account_status text not null default 'none';

alter table stores drop constraint if exists stores_stripe_account_status_chk;
alter table stores add constraint stores_stripe_account_status_chk
  check (stripe_account_status in ('none', 'onboarding', 'active', 'restricted'));

create index if not exists idx_stores_stripe_account_id
  on stores (stripe_account_id) where stripe_account_id is not null;

alter table orders add column if not exists stripe_transfer_id text;

-- +goose Down

alter table orders drop column if exists stripe_transfer_id;
drop index if exists idx_stores_stripe_account_id;
alter table stores drop constraint if exists stores_stripe_account_status_chk;
alter table stores drop column if exists stripe_account_status;
alter table stores drop column if exists stripe_account_id;
