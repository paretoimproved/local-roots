package stripepay

import (
	"context"
	"errors"
	"fmt"

	stripe "github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/client"
)

var ErrNotConfigured = errors.New("stripe not configured")

type Client struct {
	api *client.API
}

func New(secretKey string) (*Client, error) {
	if secretKey == "" {
		return nil, ErrNotConfigured
	}
	api := &client.API{}
	api.Init(secretKey, nil)
	return &Client{api: api}, nil
}

func (c *Client) Enabled() bool { return c != nil && c.api != nil }

func (c *Client) CreateCustomer(ctx context.Context, email string, name *string, phone *string) (customerID string, err error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	p := &stripe.CustomerParams{Email: stripe.String(email)}
	if name != nil && *name != "" {
		p.Name = stripe.String(*name)
	}
	if phone != nil && *phone != "" {
		p.Phone = stripe.String(*phone)
	}
	p.Context = ctx
	cus, err := c.api.Customers.New(p)
	if err != nil {
		return "", err
	}
	return cus.ID, nil
}

type CreateCheckoutPaymentIntentInput struct {
	AmountCents int
	Currency    string
	CustomerID  string
	// Metadata values should be stable IDs (plan_id, store_id, etc).
	Metadata map[string]string
}

func (c *Client) CreateCheckoutPaymentIntent(ctx context.Context, in CreateCheckoutPaymentIntentInput) (paymentIntentID string, clientSecret string, err error) {
	if !c.Enabled() {
		return "", "", ErrNotConfigured
	}
	if in.AmountCents <= 0 {
		return "", "", fmt.Errorf("amount must be > 0")
	}
	if in.Currency == "" {
		in.Currency = "usd"
	}
	p := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(in.AmountCents)),
		Currency: stripe.String(in.Currency),
		Customer: stripe.String(in.CustomerID),
		// Authorize now, capture later (on pickup confirmation).
		CaptureMethod: stripe.String(string(stripe.PaymentIntentCaptureMethodManual)),
		// Save the card for future off-session authorizations.
		SetupFutureUsage: stripe.String(string(stripe.PaymentIntentSetupFutureUsageOffSession)),
	}
	for k, v := range in.Metadata {
		p.AddMetadata(k, v)
	}
	p.Context = ctx

	pi, err := c.api.PaymentIntents.New(p)
	if err != nil {
		return "", "", err
	}
	return pi.ID, pi.ClientSecret, nil
}

func (c *Client) RetrievePaymentIntent(ctx context.Context, paymentIntentID string) (*stripe.PaymentIntent, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	if paymentIntentID == "" {
		return nil, fmt.Errorf("missing payment_intent_id")
	}
	p := &stripe.PaymentIntentParams{}
	p.Context = ctx
	return c.api.PaymentIntents.Get(paymentIntentID, p)
}

type CreateOffSessionPaymentIntentInput struct {
	AmountCents     int
	Currency        string
	CustomerID      string
	PaymentMethodID string
	Metadata        map[string]string
	// Used to avoid double-auth when retrying.
	IdempotencyKey string
}

func (c *Client) CreateOffSessionAuthorization(ctx context.Context, in CreateOffSessionPaymentIntentInput) (paymentIntentID string, status string, err error) {
	if !c.Enabled() {
		return "", "", ErrNotConfigured
	}
	if in.AmountCents <= 0 {
		return "", "", fmt.Errorf("amount must be > 0")
	}
	if in.CustomerID == "" || in.PaymentMethodID == "" {
		return "", "", fmt.Errorf("missing customer/payment method")
	}
	if in.Currency == "" {
		in.Currency = "usd"
	}
	p := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(int64(in.AmountCents)),
		Currency:      stripe.String(in.Currency),
		Customer:      stripe.String(in.CustomerID),
		PaymentMethod: stripe.String(in.PaymentMethodID),
		Confirm:       stripe.Bool(true),
		OffSession:    stripe.Bool(true),
		CaptureMethod: stripe.String(string(stripe.PaymentIntentCaptureMethodManual)),
	}
	for k, v := range in.Metadata {
		p.AddMetadata(k, v)
	}
	p.Context = ctx
	if in.IdempotencyKey != "" {
		p.SetIdempotencyKey(in.IdempotencyKey)
	}
	pi, err := c.api.PaymentIntents.New(p)
	if err != nil {
		return "", "", err
	}
	return pi.ID, string(pi.Status), nil
}

func (c *Client) CaptureAuthorization(ctx context.Context, paymentIntentID string, idempotencyKey string) error {
	if !c.Enabled() {
		return ErrNotConfigured
	}
	p := &stripe.PaymentIntentCaptureParams{}
	p.Context = ctx
	if idempotencyKey != "" {
		p.SetIdempotencyKey(idempotencyKey)
	}
	_, err := c.api.PaymentIntents.Capture(paymentIntentID, p)
	return err
}

func (c *Client) CancelPaymentIntent(ctx context.Context, paymentIntentID string, idempotencyKey string) error {
	if !c.Enabled() {
		return ErrNotConfigured
	}
	p := &stripe.PaymentIntentCancelParams{}
	p.Context = ctx
	if idempotencyKey != "" {
		p.SetIdempotencyKey(idempotencyKey)
	}
	_, err := c.api.PaymentIntents.Cancel(paymentIntentID, p)
	return err
}
