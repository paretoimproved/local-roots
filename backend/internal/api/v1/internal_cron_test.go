package v1

import (
	"context"
	"testing"
)

func TestRunReengagement_NilDB(t *testing.T) {
	_, err := RunReengagement(context.Background(), nil, nil, "")
	if err == nil {
		t.Error("expected error with nil db")
	}
}

func TestRunReviewPrompts_NilDB(t *testing.T) {
	_, err := RunReviewPrompts(context.Background(), nil, nil, "")
	if err == nil {
		t.Error("expected error with nil db")
	}
}

func TestRunSellerDigest_NilDB(t *testing.T) {
	_, err := RunSellerDigest(context.Background(), nil, nil)
	if err == nil {
		t.Error("expected error with nil db")
	}
}

func TestRunMilestoneEmails_NilDB(t *testing.T) {
	_, err := RunMilestoneEmails(context.Background(), nil, nil)
	if err == nil {
		t.Error("expected error with nil db")
	}
}

func TestRunTransferRetry_NilDB(t *testing.T) {
	_, err := RunTransferRetry(context.Background(), nil, nil)
	if err == nil {
		t.Error("expected error with nil db")
	}
}
