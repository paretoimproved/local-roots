-- +goose Up

create index if not exists stores_is_active_created_at_idx
  on stores(is_active, created_at desc);

-- +goose Down

drop index if exists stores_is_active_created_at_idx;

