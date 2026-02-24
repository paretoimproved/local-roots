-- +migrate up
alter table pickup_locations add column if not exists instructions text;

-- +migrate down
alter table pickup_locations drop column if exists instructions;
