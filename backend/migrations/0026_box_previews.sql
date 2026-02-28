-- +goose Up
CREATE TABLE box_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  cycle_date DATE NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_box_previews_plan_cycle ON box_previews(plan_id, cycle_date);

-- +goose Down
DROP TABLE box_previews;
