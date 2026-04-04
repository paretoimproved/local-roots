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

func OneTimeOrderConfirmed(boxTitle, pickupCode, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Order confirmed: %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

Your order for %s has been placed.

  Pickup code: %s

View your order:
  %s

Thanks for supporting local food!

— Local Roots
`, boxTitle, pickupCode, orderURL)
	return
}

func NewSubscriberNotification(buyerEmail, planTitle, storeName string) (subject string, body string) {
	subject = fmt.Sprintf("New subscriber to %s", planTitle)
	body = fmt.Sprintf(`Hi there!

You have a new subscriber to %s at %s.

  Buyer: %s

Log in to your dashboard to view details.

— Local Roots
`, planTitle, storeName, buyerEmail)
	return
}

func NewOrderNotification(buyerEmail, boxTitle, storeName string) (subject string, body string) {
	subject = fmt.Sprintf("New order: %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

A new order has been placed for %s at %s.

  Buyer: %s

Log in to your dashboard to view and manage this order.

— Local Roots
`, boxTitle, storeName, buyerEmail)
	return
}

func NoShowNotification(boxTitle, feeFormatted, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Missed pickup: %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

It looks like you missed your pickup for %s.

A no-show fee of %s has been charged.

View your order:
  %s

If you believe this is an error, please contact the seller.

— Local Roots
`, boxTitle, feeFormatted, orderURL)
	return
}

func NoShowWaived(boxTitle, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Missed pickup: %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

It looks like you missed your pickup for %s.

The no-show fee has been waived this time.

View your order:
  %s

— Local Roots
`, boxTitle, orderURL)
	return
}

func OrderCanceled(boxTitle, orderURL string) (subject string, body string) {
	subject = fmt.Sprintf("Order canceled: %s", boxTitle)
	body = fmt.Sprintf(`Hi there!

Your order for %s has been canceled.

View your order:
  %s

If you have any questions, please contact the seller.

— Local Roots
`, boxTitle, orderURL)
	return
}

func SubscriptionCanceled(planTitle, storeName string) (subject string, body string) {
	subject = fmt.Sprintf("Subscription canceled: %s", planTitle)
	body = fmt.Sprintf(`Hi there!

Your subscription to %s at %s has been canceled.

You will not be charged for future pickups.

If you'd like to resubscribe, visit the store page.

— Local Roots
`, planTitle, storeName)
	return
}

func LapsedSubscriberNudge(storeName, planTitle, storeURL, unsubscribeURL string) (subject string, body string) {
	subject = fmt.Sprintf("We miss you at %s!", storeName)
	body = fmt.Sprintf(`Hi there!

It's been a while since your last pickup from %s. Your %s box is waiting for you!

Don't miss out on fresh, local food. Your next box is just around the corner.

Visit the store:
  %s

— Local Roots

---
Unsubscribe from marketing emails: %s
`, storeName, planTitle, storeURL, unsubscribeURL)
	return
}

func PostPickupReviewPrompt(storeName, boxTitle, reviewURL string) (subject string, body string) {
	subject = fmt.Sprintf("How was your box from %s?", storeName)
	body = fmt.Sprintf(`Hi there!

Thanks for picking up your %s box from %s!

We'd love to hear how it was. Your feedback helps the farmer and other buyers.

Leave a review:
  %s

— Local Roots
`, boxTitle, storeName, reviewURL)
	return
}

func MilestoneCelebration(buyerName, storeName, milestone, unsubscribeURL string) (subject string, body string) {
	subject = fmt.Sprintf("Milestone: %s pickups from %s!", milestone, storeName)
	greeting := "Hi there!"
	if buyerName != "" {
		greeting = fmt.Sprintf("Hi %s!", buyerName)
	}
	body = fmt.Sprintf(`%s

You've completed %s pickups from %s. That's amazing!

Thank you for supporting local food and your community farmer. Here's to many more!

— Local Roots

---
Unsubscribe from marketing emails: %s
`, greeting, milestone, storeName, unsubscribeURL)
	return
}

func SellerWeeklyDigest(storeName string, activeSubs, pickupsThisWeek, revenueFormatted string) (subject string, body string) {
	subject = fmt.Sprintf("Weekly digest: %s", storeName)
	body = fmt.Sprintf(`Hi there!

Here's your weekly summary for %s:

  Active subscribers: %s
  Pickups this week:  %s
  Revenue this week:  %s

Log in to your dashboard for full analytics.

— Local Roots
`, storeName, activeSubs, pickupsThisWeek, revenueFormatted)
	return
}

func WaitlistNotification(city, storeURL, unsubscribeURL string) (subject string, body string) {
	subject = fmt.Sprintf("A farm just joined near %s!", city)
	body = fmt.Sprintf(`Hi there!

Great news — a new farm just joined Local Roots near %s!

Check it out and subscribe to start getting fresh, local food:
  %s

— Local Roots

---
Unsubscribe from marketing emails: %s
`, city, storeURL, unsubscribeURL)
	return
}
