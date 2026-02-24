-- Deploy AFTER code changes that enforce card-only payments
-- +goose Up

BEGIN;

-- Migrate any existing pay_at_pickup rows to card
UPDATE orders SET payment_method = 'card' WHERE payment_method = 'pay_at_pickup';

-- Replace constraint to only allow 'card'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_chk
  CHECK (payment_method IN ('card'));

-- Change default from 'pay_at_pickup' to 'card'
ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'card';

COMMIT;

-- +goose Down

BEGIN;

ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'pay_at_pickup';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_chk
  CHECK (payment_method IN ('pay_at_pickup', 'card'));

COMMIT;
