-- +goose Up
update users set role = 'admin' where lower(email) = 'admin@example.com';

-- +goose Down
update users set role = 'seller' where lower(email) = 'admin@example.com';
