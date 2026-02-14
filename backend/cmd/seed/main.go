package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := seed(ctx, pool); err != nil {
		log.Fatalf("seed: %v", err)
	}

	log.Printf("seed complete")
}

func seed(ctx context.Context, db *pgxpool.Pool) error {
	// Make the seed idempotent-ish by keying off a stable seller email.
	const sellerEmail = "seller@example.com"

	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var userID string
	if err := tx.QueryRow(ctx, `
		insert into users (email, role, display_name)
		values ($1, 'seller', 'Demo Seller')
		on conflict (email) do update set updated_at = now()
		returning id::text
	`, sellerEmail).Scan(&userID); err != nil {
		return err
	}

	var storeID string
	if err := tx.QueryRow(ctx, `
		insert into stores (owner_user_id, name, description, phone, is_active)
		values ($1::uuid, 'Demo Farm', 'Seasonal produce for pickup.', '555-0100', true)
		on conflict (owner_user_id) do update
			set name = excluded.name,
			    description = excluded.description,
			    phone = excluded.phone,
			    is_active = true,
			    updated_at = now()
		returning id::text
	`, userID).Scan(&storeID); err != nil {
		return err
	}

	// Reset the demo store's inventory/windows to keep repeated seed runs clean.
	// This only affects the demo store (identified by sellerEmail).
	if _, err := tx.Exec(ctx, `delete from offerings where store_id = $1::uuid`, storeID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `delete from products where store_id = $1::uuid`, storeID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `delete from pickup_windows where store_id = $1::uuid`, storeID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `delete from pickup_locations where store_id = $1::uuid`, storeID); err != nil {
		return err
	}

	var locationID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_locations (store_id, label, address1, city, region, postal_code, country, timezone)
		values ($1::uuid, 'Main pickup', '123 Market St', 'Springfield', 'CA', '99999', 'US', 'America/Los_Angeles')
		returning id::text
	`, storeID).Scan(&locationID); err != nil {
		return err
	}

	start := time.Now().UTC().Add(48 * time.Hour).Truncate(time.Hour)
	end := start.Add(2 * time.Hour)
	cutoff := start.Add(-12 * time.Hour)

	var windowID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'published', 'Bring your order confirmation.')
		returning id::text
	`, storeID, locationID, start, end, cutoff).Scan(&windowID); err != nil {
		return err
	}

	type prod struct {
		title       string
		unit        string
		desc        string
		priceCents  int
		quantity    int
		perishable  bool
	}
	products := []prod{
		{title: "Eggs (dozen)", unit: "each", desc: "Pasture-raised.", priceCents: 700, quantity: 30, perishable: true},
		{title: "Heirloom tomatoes", unit: "lb", desc: "Mixed varieties.", priceCents: 500, quantity: 40, perishable: true},
		{title: "Sourdough loaf", unit: "each", desc: "Baked the morning of pickup.", priceCents: 900, quantity: 20, perishable: true},
	}

	for _, p := range products {
		var productID string
		if err := tx.QueryRow(ctx, `
			insert into products (store_id, title, description, unit, is_perishable, is_active)
			values ($1::uuid, $2, $3, $4, $5, true)
			returning id::text
		`, storeID, p.title, p.desc, p.unit, p.perishable).Scan(&productID); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
			values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, 'active')
		`, storeID, windowID, productID, p.priceCents, p.quantity)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	fmt.Printf("Seeded store %s with pickup window %s\n", storeID, windowID)
	return nil
}
