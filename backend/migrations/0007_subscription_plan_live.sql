-- +goose Up

alter table subscription_plans add column if not exists is_live boolean not null default false;

create index if not exists subscription_plans_store_id_is_live_idx
  on subscription_plans(store_id, is_live)
  where is_active = true;

-- +goose Down

drop index if exists subscription_plans_store_id_is_live_idx;
alter table subscription_plans drop column if exists is_live;

