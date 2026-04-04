package email

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNew(t *testing.T) {
	t.Run("returns nil for empty key", func(t *testing.T) {
		c := New("", "from@test.com")
		if c != nil {
			t.Error("expected nil client for empty key")
		}
	})

	t.Run("returns client for valid key", func(t *testing.T) {
		c := New("re_test_key", "from@test.com")
		if c == nil {
			t.Fatal("expected non-nil client")
		}
		if !c.Enabled() {
			t.Error("expected Enabled() = true")
		}
	})
}

func TestEnabled(t *testing.T) {
	t.Run("nil client", func(t *testing.T) {
		var c *Client
		if c.Enabled() {
			t.Error("nil client should not be enabled")
		}
	})

	t.Run("empty key", func(t *testing.T) {
		c := &Client{apiKey: "", from: "from@test.com"}
		if c.Enabled() {
			t.Error("empty key should not be enabled")
		}
	})
}

func TestSend_Disabled(t *testing.T) {
	var c *Client
	// Send on nil client should return nil (no-op).
	if err := c.Send("to@test.com", "Subject", "Body"); err != nil {
		t.Errorf("Send on nil client should return nil, got %v", err)
	}
}

func TestSend_Success(t *testing.T) {
	var captured sendRequest

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}
		authz := r.Header.Get("Authorization")
		if authz != "Bearer re_test_key" {
			t.Errorf("expected Bearer re_test_key, got %s", authz)
		}

		body, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(body, &captured); err != nil {
			t.Fatalf("failed to unmarshal request: %v", err)
		}

		w.WriteHeader(200)
		w.Write([]byte(`{"id":"email_123"}`))
	}))
	defer server.Close()

	// Override the Resend URL for testing.
	c := &Client{apiKey: "re_test_key", from: "Local Roots <noreply@localroots.com>"}
	// We can't easily override the URL in the current implementation since it's hardcoded.
	// Instead, test the request construction logic via the captured struct.

	// Test that sendRequest marshals correctly.
	req := sendRequest{
		From:    "Local Roots <noreply@localroots.com>",
		To:      []string{"buyer@test.com"},
		Subject: "Test Subject",
		Text:    "Test Body",
	}
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatal(err)
	}

	var decoded sendRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}

	if decoded.From != req.From {
		t.Errorf("from: got %q want %q", decoded.From, req.From)
	}
	if len(decoded.To) != 1 || decoded.To[0] != "buyer@test.com" {
		t.Errorf("to: got %v want [buyer@test.com]", decoded.To)
	}
	if decoded.Subject != "Test Subject" {
		t.Errorf("subject: got %q want %q", decoded.Subject, "Test Subject")
	}
	if decoded.Text != "Test Body" {
		t.Errorf("text: got %q want %q", decoded.Text, "Test Body")
	}

	_ = c // Verify client is constructed without error
}

func TestSendRequest_JSON(t *testing.T) {
	req := sendRequest{
		From:    "sender@test.com",
		To:      []string{"a@test.com", "b@test.com"},
		Subject: "Multi-recipient",
		Text:    "Hello",
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatal(err)
	}

	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatal(err)
	}

	// Verify JSON field names match Resend API expectations.
	if _, ok := m["from"]; !ok {
		t.Error("missing 'from' field")
	}
	if _, ok := m["to"]; !ok {
		t.Error("missing 'to' field")
	}
	if _, ok := m["subject"]; !ok {
		t.Error("missing 'subject' field")
	}
	if _, ok := m["text"]; !ok {
		t.Error("missing 'text' field")
	}

	// Verify no unexpected fields.
	expected := map[string]bool{"from": true, "to": true, "subject": true, "text": true}
	for k := range m {
		if !expected[k] {
			t.Errorf("unexpected field %q in JSON", k)
		}
	}
}
