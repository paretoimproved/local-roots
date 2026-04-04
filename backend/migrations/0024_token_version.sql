-- +goose Up
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1;

-- +goose Down
ALTER TABLE users DROP COLUMN token_version;
