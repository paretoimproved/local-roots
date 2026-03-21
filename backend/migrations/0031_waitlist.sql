-- +goose Up
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ
);
CREATE INDEX idx_waitlist_geo ON waitlist(lat, lng) WHERE notified_at IS NULL;
CREATE UNIQUE INDEX idx_waitlist_email ON waitlist(lower(email));

-- +goose Down
DROP TABLE waitlist;
