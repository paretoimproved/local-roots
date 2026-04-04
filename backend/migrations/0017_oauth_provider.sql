-- +goose Up
ALTER TABLE users ADD COLUMN oauth_provider text;
ALTER TABLE users ADD COLUMN oauth_provider_id text;
CREATE UNIQUE INDEX users_oauth_provider_id_uniq
  ON users (oauth_provider, oauth_provider_id)
  WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS users_oauth_provider_id_uniq;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider_id;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider;
