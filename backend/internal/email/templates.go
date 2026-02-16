package email

import "fmt"

func SubscriptionConfirmed(boxTitle string, nextPickupDate string, location string, manageURL string) (subject string, body string) {
	subject = fmt.Sprintf("You're subscribed to %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

You're now subscribed to %s.

Your next pickup:
  %s
  %s

Manage your subscription:
  %s

Thanks for supporting local food!

— Local Roots
`, boxTitle, nextPickupDate, location, manageURL)
	return
}

func PickupReminder(boxTitle string, pickupTime string, location string, pickupCode string, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Pickup reminder: %s tomorrow", boxTitle)
	body = fmt.Sprintf(`Hi there!

Your %s pickup is coming up:

  When: %s
  Where: %s
  Pickup code: %s

View your order:
  %s

See you there!

— Local Roots
`, boxTitle, pickupTime, location, pickupCode, orderURL)
	return
}

func OrderReady(boxTitle string, pickupCode string, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Your %s order is ready!", boxTitle)
	body = fmt.Sprintf(`Hi there!

Your %s order is ready for pickup!

  Pickup code: %s

View your order:
  %s

— Local Roots
`, boxTitle, pickupCode, orderURL)
	return
}

func MagicLink(verifyURL string) (subject string, body string) {
	subject = "Your Local Roots sign-in link"
	body = fmt.Sprintf(`Hi there!

Click the link below to sign in to Local Roots:

  %s

This link expires in 15 minutes. If you didn't request this, you can ignore this email.

— Local Roots
`, verifyURL)
	return
}

func PaymentReceipt(amountFormatted string, boxTitle string, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Receipt: %s for %s", amountFormatted, boxTitle)
	body = fmt.Sprintf(`Hi there!

Your payment of %s for %s has been processed.

View your order:
  %s

Thank you for supporting local food!

— Local Roots
`, amountFormatted, boxTitle, orderURL)
	return
}
