package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type Client struct {
	apiKey string
	from   string
}

func New(apiKey string, from string) *Client {
	if apiKey == "" {
		return nil
	}
	return &Client{apiKey: apiKey, from: from}
}

func (c *Client) Enabled() bool { return c != nil && c.apiKey != "" }

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

// Send sends a plain-text email via Resend. Fire-and-forget safe.
func (c *Client) Send(to string, subject string, body string) error {
	if !c.Enabled() {
		return nil
	}

	payload, err := json.Marshal(sendRequest{
		From:    c.from,
		To:      []string{to},
		Subject: subject,
		Text:    body,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("resend: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

// SendAsync sends an email in a goroutine. Errors are logged, not returned.
func (c *Client) SendAsync(to string, subject string, body string) {
	if !c.Enabled() {
		return
	}
	go func() {
		if err := c.Send(to, subject, body); err != nil {
			log.Printf("email send error to=%s subject=%q: %v", to, subject, err)
		}
	}()
}
