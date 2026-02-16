package stripepay

import (
	"context"
	"errors"
	"fmt"

	stripe "github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/account"
	"github.com/stripe/stripe-go/v78/accountlink"
	"github.com/stripe/stripe-go/v78/client"
	"github.com/stripe/stripe-go/v78/setupintent"
	"github.com/stripe/stripe-go/v78/transfer"
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

func (c *Client) FindOrCreateCustomer(ctx context.Context, email string, name *string, phone *string) (string, error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	// Search for existing customer by email.
	searchParams := &stripe.CustomerSearchParams{}
	searchParams.Context = ctx
	searchParams.Query = fmt.Sprintf("email:'%s'", email)
	searchParams.Single = true
	iter := c.api.Customers.Search(searchParams)
	if iter.Next() {
		return iter.Customer().ID, nil
	}
	if err := iter.Err(); err != nil {
		return "", err
	}
	// No existing customer found; create one.
	return c.CreateCustomer(ctx, email, name, phone)
}

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

func (c *Client) CreateSetupIntent(ctx context.Context, customerID string, metadata map[string]string) (setupIntentID string, clientSecret string, err error) {
	if !c.Enabled() {
		return "", "", ErrNotConfigured
	}
	if customerID == "" {
		return "", "", fmt.Errorf("missing customer_id")
	}
	p := &stripe.SetupIntentParams{
		Customer: stripe.String(customerID),
		Usage:    stripe.String(string(stripe.SetupIntentUsageOffSession)),
	}
	for k, v := range metadata {
		p.AddMetadata(k, v)
	}
	p.Context = ctx

	si, err := setupintent.New(p)
	if err != nil {
		return "", "", err
	}
	return si.ID, si.ClientSecret, nil
}

func (c *Client) RetrieveSetupIntent(ctx context.Context, setupIntentID string) (*stripe.SetupIntent, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	if setupIntentID == "" {
		return nil, fmt.Errorf("missing setup_intent_id")
	}
	p := &stripe.SetupIntentParams{}
	p.Context = ctx
	return setupintent.Get(setupIntentID, p)
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

func (c *Client) CaptureAuthorizationAmount(ctx context.Context, paymentIntentID string, amountCents int, idempotencyKey string) error {
	if !c.Enabled() {
		return ErrNotConfigured
	}
	if amountCents < 0 {
		return fmt.Errorf("amount must be >= 0")
	}
	p := &stripe.PaymentIntentCaptureParams{}
	p.Context = ctx
	// Stripe supports partial capture on a manually-captured PaymentIntent. Any remaining
	// amount is automatically canceled.
	p.AmountToCapture = stripe.Int64(int64(amountCents))
	if idempotencyKey != "" {
		p.SetIdempotencyKey(idempotencyKey)
	}
	_, err := c.api.PaymentIntents.Capture(paymentIntentID, p)
	return err
}

// --- Stripe Connect ---

func (c *Client) CreateConnectAccount(ctx context.Context, email string) (accountID string, err error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	p := &stripe.AccountParams{
		Type:         stripe.String(string(stripe.AccountTypeExpress)),
		Email:        stripe.String(email),
		Capabilities: &stripe.AccountCapabilitiesParams{
			CardPayments: &stripe.AccountCapabilitiesCardPaymentsParams{
				Requested: stripe.Bool(true),
			},
			Transfers: &stripe.AccountCapabilitiesTransfersParams{
				Requested: stripe.Bool(true),
			},
		},
	}
	p.Context = ctx
	acct, err := account.New(p)
	if err != nil {
		return "", err
	}
	return acct.ID, nil
}

func (c *Client) CreateAccountLink(ctx context.Context, accountID string, refreshURL string, returnURL string) (url string, err error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	p := &stripe.AccountLinkParams{
		Account:    stripe.String(accountID),
		RefreshURL: stripe.String(refreshURL),
		ReturnURL:  stripe.String(returnURL),
		Type:       stripe.String("account_onboarding"),
	}
	p.Context = ctx
	link, err := accountlink.New(p)
	if err != nil {
		return "", err
	}
	return link.URL, nil
}

type ConnectAccountStatus struct {
	ChargesEnabled bool
	PayoutsEnabled bool
	Status         string // "none", "onboarding", "active", "restricted"
}

func (c *Client) GetAccountStatus(ctx context.Context, accountID string) (*ConnectAccountStatus, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	p := &stripe.AccountParams{}
	p.Context = ctx
	acct, err := account.GetByID(accountID, p)
	if err != nil {
		return nil, err
	}

	status := "onboarding"
	if acct.ChargesEnabled && acct.PayoutsEnabled {
		status = "active"
	} else if acct.Requirements != nil && len(acct.Requirements.Errors) > 0 {
		status = "restricted"
	} else if acct.ChargesEnabled || acct.PayoutsEnabled {
		status = "restricted"
	}

	return &ConnectAccountStatus{
		ChargesEnabled: acct.ChargesEnabled,
		PayoutsEnabled: acct.PayoutsEnabled,
		Status:         status,
	}, nil
}

func (c *Client) CreateTransfer(ctx context.Context, amountCents int, connectedAccountID string, chargeID string, idempotencyKey string) (transferID string, err error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	if amountCents <= 0 {
		return "", fmt.Errorf("transfer amount must be > 0")
	}
	p := &stripe.TransferParams{
		Amount:      stripe.Int64(int64(amountCents)),
		Currency:    stripe.String("usd"),
		Destination: stripe.String(connectedAccountID),
	}
	if chargeID != "" {
		p.SourceTransaction = stripe.String(chargeID)
	}
	p.Context = ctx
	if idempotencyKey != "" {
		p.SetIdempotencyKey(idempotencyKey)
	}
	t, err := transfer.New(p)
	if err != nil {
		return "", err
	}
	return t.ID, nil
}

// GetChargeIDFromPaymentIntent retrieves the latest charge ID for a captured PaymentIntent.
func (c *Client) GetChargeIDFromPaymentIntent(ctx context.Context, paymentIntentID string) (string, error) {
	if !c.Enabled() {
		return "", ErrNotConfigured
	}
	pi, err := c.RetrievePaymentIntent(ctx, paymentIntentID)
	if err != nil {
		return "", err
	}
	if pi.LatestCharge != nil && pi.LatestCharge.ID != "" {
		return pi.LatestCharge.ID, nil
	}
	return "", fmt.Errorf("no charge found for payment intent %s", paymentIntentID)
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
