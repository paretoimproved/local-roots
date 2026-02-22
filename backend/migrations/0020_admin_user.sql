-- +goose Up
update users set role = 'admin' where lower(email) = 'brandonq812@gmail.com';

-- +goose Down
update users set role = 'seller' where lower(email) = 'brandonq812@gmail.com';
