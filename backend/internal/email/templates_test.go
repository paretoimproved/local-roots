package email

import (
	"strings"
	"testing"
)

func TestSubscriptionConfirmed(t *testing.T) {
	subj, body := SubscriptionConfirmed("Weekly Veggie Box", "Sat Feb 14 at 10:00 AM", "Downtown Farmers Market, 123 Main St", "https://localroots.com/subscriptions/abc?t=tok")

	if !strings.Contains(subj, "Weekly Veggie Box") {
		t.Errorf("subject should contain box title, got %q", subj)
	}
	if !strings.Contains(body, "Weekly Veggie Box") {
		t.Error("body should contain box title")
	}
	if !strings.Contains(body, "Sat Feb 14 at 10:00 AM") {
		t.Error("body should contain pickup date")
	}
	if !strings.Contains(body, "Downtown Farmers Market") {
		t.Error("body should contain location")
	}
	if !strings.Contains(body, "https://localroots.com/subscriptions/abc?t=tok") {
		t.Error("body should contain manage URL")
	}
}

func TestPickupReminder(t *testing.T) {
	subj, body := PickupReminder("Weekly Veggie Box", "Sat Feb 14 at 10:00 AM", "Downtown Market", "ABC123", "https://localroots.com/orders/xyz?t=tok")

	if !strings.Contains(subj, "Weekly Veggie Box") {
		t.Errorf("subject should contain box title, got %q", subj)
	}
	if !strings.Contains(subj, "tomorrow") {
		t.Errorf("subject should mention tomorrow, got %q", subj)
	}
	if !strings.Contains(body, "ABC123") {
		t.Error("body should contain pickup code")
	}
	if !strings.Contains(body, "https://localroots.com/orders/xyz?t=tok") {
		t.Error("body should contain order URL")
	}
}

func TestOrderReady(t *testing.T) {
	subj, body := OrderReady("Weekly Veggie Box", "ABC123", "https://localroots.com/orders/xyz?t=tok")

	if !strings.Contains(subj, "ready") {
		t.Errorf("subject should mention ready, got %q", subj)
	}
	if !strings.Contains(body, "ABC123") {
		t.Error("body should contain pickup code")
	}
	if !strings.Contains(body, "https://localroots.com/orders/xyz?t=tok") {
		t.Error("body should contain order URL")
	}
}

func TestMagicLink(t *testing.T) {
	subj, body := MagicLink("https://localroots.com/buyer/auth/verify?token=secret123")

	if subj == "" {
		t.Error("subject should not be empty")
	}
	if !strings.Contains(body, "https://localroots.com/buyer/auth/verify?token=secret123") {
		t.Error("body should contain verify URL")
	}
	if !strings.Contains(body, "15 minutes") {
		t.Error("body should mention expiration time")
	}
}

func TestPaymentReceipt(t *testing.T) {
	subj, body := PaymentReceipt("$25.00", "Weekly Veggie Box", "https://localroots.com/orders/xyz?t=tok")

	if !strings.Contains(subj, "$25.00") {
		t.Errorf("subject should contain amount, got %q", subj)
	}
	if !strings.Contains(subj, "Weekly Veggie Box") {
		t.Errorf("subject should contain box title, got %q", subj)
	}
	if !strings.Contains(body, "$25.00") {
		t.Error("body should contain amount")
	}
	if !strings.Contains(body, "https://localroots.com/orders/xyz?t=tok") {
		t.Error("body should contain order URL")
	}
}

func TestTemplatesReturnNonEmpty(t *testing.T) {
	templates := []struct {
		name string
		fn   func() (string, string)
	}{
		{"SubscriptionConfirmed", func() (string, string) {
			return SubscriptionConfirmed("Box", "Date", "Location", "URL")
		}},
		{"PickupReminder", func() (string, string) {
			return PickupReminder("Box", "Time", "Location", "Code", "URL")
		}},
		{"OrderReady", func() (string, string) { return OrderReady("Box", "Code", "URL") }},
		{"MagicLink", func() (string, string) { return MagicLink("URL") }},
		{"PaymentReceipt", func() (string, string) { return PaymentReceipt("$10", "Box", "URL") }},
	}

	for _, tc := range templates {
		t.Run(tc.name, func(t *testing.T) {
			subj, body := tc.fn()
			if subj == "" {
				t.Error("subject should not be empty")
			}
			if body == "" {
				t.Error("body should not be empty")
			}
			if !strings.Contains(body, "Local Roots") {
				t.Error("body should contain sender signature")
			}
		})
	}
}
