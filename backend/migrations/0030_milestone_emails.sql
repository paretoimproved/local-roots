-- +goose Up
CREATE TABLE milestone_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_milestone_emails_sub_milestone ON milestone_emails(subscription_id, milestone);

-- +goose Down
DROP TABLE milestone_emails;
