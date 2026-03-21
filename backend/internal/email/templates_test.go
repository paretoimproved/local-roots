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

func TestLapsedSubscriberNudge(t *testing.T) {
	subj, body := LapsedSubscriberNudge("Green Acres", "Weekly Veggie Box", "https://localroots.farm/stores/abc")

	if !strings.Contains(subj, "Green Acres") {
		t.Errorf("subject should contain store name, got %q", subj)
	}
	if !strings.Contains(body, "Weekly Veggie Box") {
		t.Error("body should contain plan title")
	}
	if !strings.Contains(body, "https://localroots.farm/stores/abc") {
		t.Error("body should contain store URL")
	}
}

func TestPostPickupReviewPrompt(t *testing.T) {
	subj, body := PostPickupReviewPrompt("Green Acres", "Weekly Box", "https://localroots.farm/orders/xyz?t=tok")

	if !strings.Contains(subj, "Green Acres") {
		t.Errorf("subject should contain store name, got %q", subj)
	}
	if !strings.Contains(body, "Weekly Box") {
		t.Error("body should contain box title")
	}
	if !strings.Contains(body, "https://localroots.farm/orders/xyz?t=tok") {
		t.Error("body should contain review URL")
	}
}

func TestMilestoneCelebration(t *testing.T) {
	subj, body := MilestoneCelebration("Alice", "Green Acres", "10")
	if !strings.Contains(subj, "10") {
		t.Errorf("subject should contain milestone count, got %q", subj)
	}
	if !strings.Contains(body, "Alice") {
		t.Error("body should contain buyer name")
	}
	if !strings.Contains(body, "Green Acres") {
		t.Error("body should contain store name")
	}

	// Empty buyer name falls back to generic greeting
	_, bodyNoName := MilestoneCelebration("", "Farm", "5")
	if !strings.Contains(bodyNoName, "Hi there!") {
		t.Error("empty buyer name should use generic greeting")
	}
}

func TestSellerWeeklyDigest(t *testing.T) {
	subj, body := SellerWeeklyDigest("Green Acres", "12", "8", "$250.00")
	if !strings.Contains(subj, "Green Acres") {
		t.Errorf("subject should contain store name, got %q", subj)
	}
	if !strings.Contains(body, "12") {
		t.Error("body should contain subscriber count")
	}
	if !strings.Contains(body, "8") {
		t.Error("body should contain pickup count")
	}
	if !strings.Contains(body, "$250.00") {
		t.Error("body should contain revenue")
	}
}

func TestWaitlistNotification(t *testing.T) {
	subj, body := WaitlistNotification("Austin", "https://localroots.farm/stores/xyz")
	if !strings.Contains(subj, "Austin") {
		t.Errorf("subject should contain city, got %q", subj)
	}
	if !strings.Contains(body, "https://localroots.farm/stores/xyz") {
		t.Error("body should contain store URL")
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
		{"LapsedSubscriberNudge", func() (string, string) {
			return LapsedSubscriberNudge("Store", "Plan", "URL")
		}},
		{"PostPickupReviewPrompt", func() (string, string) {
			return PostPickupReviewPrompt("Store", "Box", "URL")
		}},
		{"MilestoneCelebration", func() (string, string) {
			return MilestoneCelebration("Name", "Store", "5")
		}},
		{"SellerWeeklyDigest", func() (string, string) {
			return SellerWeeklyDigest("Store", "10", "5", "$100")
		}},
		{"WaitlistNotification", func() (string, string) {
			return WaitlistNotification("City", "URL")
		}},
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
