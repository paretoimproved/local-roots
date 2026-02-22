package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/paretoimproved/local-roots/backend/internal/auth"
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

type farm struct {
	sellerEmail string
	sellerName  string
	storeName   string
	storeDesc   string
	storeImage  string
	phone       string
	location    location
	products    []product
	plan        plan
	reviews     []review
}

type location struct {
	label    string
	address1 string
	city     string
	region   string
	postal   string
	timezone string
	lat      float64
	lng      float64
}

type product struct {
	title      string
	unit       string
	desc       string
	priceCents int
	quantity   int
	imageURL   string
}

type plan struct {
	title       string
	desc        string
	cadence     string
	priceCents  int
	subLimit    int
	durationMin int
	cutoffHours int
}

type review struct {
	buyerEmail string
	buyerName  string
	rating     int
	body       string
}

func seed(ctx context.Context, db *pgxpool.Pool) error {
	seedPassword := os.Getenv("DEMO_SEED_PASSWORD")

	farms := []farm{
		{
			sellerEmail: "maria@greenvalley.farm",
			sellerName:  "Maria Santos",
			storeName:   "Green Valley Urban Farm",
			storeDesc:   "Organic vegetables and herbs grown in the heart of Austin using regenerative practices.",
			storeImage:  "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=800&q=80",
			phone:       "512-555-0101",
			location: location{
				label:    "SFC Farmers' Market",
				address1: "422 Guadalupe St",
				city:     "Austin",
				region:   "TX",
				postal:   "78701",
				timezone: "America/Chicago",
				lat:      30.2672,
				lng:      -97.7431,
			},
			products: []product{
				{title: "Rainbow chard bunch", unit: "bunch", desc: "Vibrant stems, tender leaves.", priceCents: 450, quantity: 40, imageURL: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80"},
				{title: "Mixed cherry tomatoes", unit: "pint", desc: "Sun gold, black cherry, and sweet 100s.", priceCents: 600, quantity: 50, imageURL: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80"},
				{title: "Fresh basil bunch", unit: "bunch", desc: "Genovese basil, incredibly aromatic.", priceCents: 350, quantity: 30, imageURL: "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=800&q=80"},
				{title: "Japanese eggplant", unit: "lb", desc: "Slender, tender, and creamy when cooked.", priceCents: 500, quantity: 25, imageURL: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=800&q=80"},
			},
			plan: plan{title: "Weekly Harvest Box", desc: "A curated selection of whatever is ripest and most delicious this week. Expect 8-10 items.", cadence: "weekly", priceCents: 3500, subLimit: 50, durationMin: 120, cutoffHours: 24},
			reviews: []review{
				{buyerEmail: "jenny@example.com", buyerName: "Jenny L.", rating: 5, body: "The cherry tomatoes are unreal — bursting with flavor. My kids devour them before I can cook with them."},
				{buyerEmail: "carlos@example.com", buyerName: "Carlos M.", rating: 4, body: "Great variety every week. The basil alone is worth it. Only wish pickup hours were a bit longer."},
			},
		},
		{
			sellerEmail: "david@heritageorchard.farm",
			sellerName:  "David Park",
			storeName:   "Heritage Orchard Collective",
			storeDesc:   "Rare heritage fruit varieties from a 40-year-old orchard in the Willamette Valley.",
			storeImage:  "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=800&q=80",
			phone:       "503-555-0202",
			location: location{
				label:    "Portland State University Market",
				address1: "1800 SW Broadway",
				city:     "Portland",
				region:   "OR",
				postal:   "97201",
				timezone: "America/Los_Angeles",
				lat:      45.5152,
				lng:      -122.6784,
			},
			products: []product{
				{title: "Honeycrisp apples", unit: "lb", desc: "Perfectly balanced sweet-tart crunch.", priceCents: 450, quantity: 60, imageURL: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=800&q=80"},
				{title: "Bartlett pears", unit: "lb", desc: "Buttery, juicy, tree-ripened.", priceCents: 400, quantity: 40, imageURL: "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=800&q=80"},
				{title: "Italian prune plums", unit: "lb", desc: "Dense, sweet flesh — perfect for baking.", priceCents: 500, quantity: 30, imageURL: "https://images.unsplash.com/photo-1502216884214-59be0e2b4a83?w=800&q=80"},
			},
			plan: plan{title: "Fruit & Orchard Box", desc: "A biweekly box of peak-season heritage fruit. 6-8 lbs of whatever the orchard is producing.", cadence: "biweekly", priceCents: 2800, subLimit: 30, durationMin: 90, cutoffHours: 48},
			reviews: []review{
				{buyerEmail: "sarah@example.com", buyerName: "Sarah K.", rating: 5, body: "These are the best pears I've ever had. You can taste the difference from store-bought."},
				{buyerEmail: "mike@example.com", buyerName: "Mike R.", rating: 5, body: "The heritage apple varieties are amazing. My family fights over the last one every time."},
			},
		},
		{
			sellerEmail: "tom@mountainvalley.ranch",
			sellerName:  "Tom & Lisa Hernandez",
			storeName:   "Mountain Valley Ranch",
			storeDesc:   "Pasture-raised meats and eggs from our family ranch at 7,000 feet in the Colorado Rockies.",
			storeImage:  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80",
			phone:       "720-555-0303",
			location: location{
				label:    "Boulder County Farmers Market",
				address1: "1300 Canyon Blvd",
				city:     "Boulder",
				region:   "CO",
				postal:   "80302",
				timezone: "America/Denver",
				lat:      40.0150,
				lng:      -105.2705,
			},
			products: []product{
				{title: "Grass-fed ground beef", unit: "lb", desc: "80/20 blend, no hormones or antibiotics.", priceCents: 1200, quantity: 30, imageURL: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800&q=80"},
				{title: "Pasture-raised eggs", unit: "dozen", desc: "Deep orange yolks from happy hens.", priceCents: 800, quantity: 40, imageURL: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80"},
				{title: "Breakfast sausage links", unit: "lb", desc: "Sage, black pepper, and a touch of maple.", priceCents: 1100, quantity: 20, imageURL: "https://images.unsplash.com/photo-1432139509613-5c4255a1d1f6?w=800&q=80"},
				{title: "Bone-in pork chops", unit: "lb", desc: "Heritage breed, 1-inch thick cut.", priceCents: 1400, quantity: 15, imageURL: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80"},
			},
			plan: plan{title: "Protein Box", desc: "Monthly box of premium pasture-raised meats and eggs. Approx 8-10 lbs of protein for your freezer.", cadence: "monthly", priceCents: 6500, subLimit: 25, durationMin: 120, cutoffHours: 72},
			reviews: []review{
				{buyerEmail: "anna@example.com", buyerName: "Anna W.", rating: 5, body: "We cancelled our Costco meat runs. This is better in every way — taste, ethics, and supporting local."},
			},
		},
		{
			sellerEmail: "keisha@piedmont.farm",
			sellerName:  "Keisha Thompson",
			storeName:   "Piedmont Community Farm",
			storeDesc:   "Community-supported agriculture serving the Triangle since 2018. Certified naturally grown.",
			storeImage:  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
			phone:       "919-555-0404",
			location: location{
				label:    "Carrboro Farmers Market",
				address1: "301 W Main St",
				city:     "Chapel Hill",
				region:   "NC",
				postal:   "27516",
				timezone: "America/New_York",
				lat:      35.9132,
				lng:      -79.0558,
			},
			products: []product{
				{title: "Mixed salad greens", unit: "bag", desc: "Arugula, mizuna, baby kale, and red mustard.", priceCents: 500, quantity: 50, imageURL: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80"},
				{title: "Sweet potatoes", unit: "lb", desc: "Beauregard variety, cured for sweetness.", priceCents: 350, quantity: 60, imageURL: "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=800&q=80"},
				{title: "Sugar snap peas", unit: "lb", desc: "Crisp, sweet, and perfect for snacking.", priceCents: 600, quantity: 25, imageURL: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=800&q=80"},
				{title: "Heirloom tomatoes", unit: "lb", desc: "Cherokee purple, Brandywine, and Green Zebra.", priceCents: 550, quantity: 35, imageURL: "https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=800&q=80"},
			},
			plan: plan{title: "Full Share CSA", desc: "A weekly full share box with 10-12 seasonal items. Feeds a family of four.", cadence: "weekly", priceCents: 4200, subLimit: 40, durationMin: 150, cutoffHours: 24},
			reviews: []review{
				{buyerEmail: "priya@example.com", buyerName: "Priya S.", rating: 5, body: "Keisha grows the most incredible sweet potatoes. My toddler eats them plain."},
				{buyerEmail: "james@example.com", buyerName: "James D.", rating: 4, body: "Consistent quality week after week. The salad greens are restaurant quality."},
			},
		},
		{
			sellerEmail: "yuki@rainycity.farm",
			sellerName:  "Yuki Tanaka",
			storeName:   "Rainy City Mushroom Co",
			storeDesc:   "Indoor-grown gourmet and medicinal mushrooms. Fruited fresh in our Seattle grow rooms.",
			storeImage:  "https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=800&q=80",
			phone:       "206-555-0505",
			location: location{
				label:    "University District Farmers Market",
				address1: "5031 University Way NE",
				city:     "Seattle",
				region:   "WA",
				postal:   "98105",
				timezone: "America/Los_Angeles",
				lat:      47.6062,
				lng:      -122.3321,
			},
			products: []product{
				{title: "Lion's mane", unit: "lb", desc: "Brain-boosting, lobster-like texture.", priceCents: 1800, quantity: 20, imageURL: "https://images.unsplash.com/photo-1638158075898-3e4499caf498?w=800&q=80"},
				{title: "Blue oyster mushrooms", unit: "lb", desc: "Velvety caps, delicate flavor.", priceCents: 1400, quantity: 30, imageURL: "https://images.unsplash.com/photo-1621956838481-1d14e1079f23?w=800&q=80"},
				{title: "Shiitake", unit: "lb", desc: "Thick caps, deep umami flavor.", priceCents: 1600, quantity: 25, imageURL: "https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=800&q=80"},
			},
			plan: plan{title: "Mushroom Lovers Box", desc: "A biweekly assortment of 2-3 lbs of our freshest gourmet mushrooms, harvested the morning of pickup.", cadence: "biweekly", priceCents: 3200, subLimit: 20, durationMin: 90, cutoffHours: 24},
			reviews: []review{
				{buyerEmail: "emma@example.com", buyerName: "Emma C.", rating: 5, body: "The lion's mane is unbelievable. I sear it in butter and it tastes like crab cakes."},
				{buyerEmail: "noah@example.com", buyerName: "Noah B.", rating: 5, body: "Freshest mushrooms in Seattle, hands down. You can smell them through the bag."},
			},
		},
	}

	for i, f := range farms {
		if err := seedFarm(ctx, db, f, seedPassword); err != nil {
			return fmt.Errorf("farm %d (%s): %w", i, f.storeName, err)
		}
		fmt.Printf("Seeded: %s\n", f.storeName)
	}

	// Ensure an admin user exists for demo mode access.
	if _, err := db.Exec(ctx, `
		insert into users (email, role, display_name)
		values ('brandonq812@gmail.com', 'admin', 'Brandon')
		on conflict (email) do update
			set role = 'admin', updated_at = now()
	`); err != nil {
		return fmt.Errorf("admin user: %w", err)
	}
	fmt.Println("Seeded: admin user (brandonq812@gmail.com)")

	return nil
}

func seedFarm(ctx context.Context, db *pgxpool.Pool, f farm, seedPassword string) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// --- User ---
	var passwordHash any
	if seedPassword != "" {
		h, err := auth.HashPassword(seedPassword)
		if err != nil {
			return err
		}
		passwordHash = h
	}

	var userID string
	if err := tx.QueryRow(ctx, `
		insert into users (email, role, display_name, password_hash)
		values ($1, 'seller', $2, $3)
		on conflict (email) do update
			set updated_at = now(),
			    display_name = excluded.display_name,
			    password_hash = coalesce(excluded.password_hash, users.password_hash)
		returning id::text
	`, f.sellerEmail, f.sellerName, passwordHash).Scan(&userID); err != nil {
		return fmt.Errorf("user: %w", err)
	}

	// --- Store ---
	var storeID string
	if err := tx.QueryRow(ctx, `
		insert into stores (owner_user_id, name, description, phone, image_url, is_active, is_demo)
		values ($1::uuid, $2, $3, $4, $5, true, true)
		on conflict (owner_user_id) do update
			set name = excluded.name,
			    description = excluded.description,
			    phone = excluded.phone,
			    image_url = excluded.image_url,
			    is_active = true,
			    is_demo = true,
			    updated_at = now()
		returning id::text
	`, userID, f.storeName, f.storeDesc, f.phone, f.storeImage).Scan(&storeID); err != nil {
		return fmt.Errorf("store: %w", err)
	}

	// --- Clean slate for this store ---
	for _, tbl := range []string{"reviews", "orders", "subscription_cycles", "subscriptions", "subscription_plans", "offerings", "products", "pickup_windows", "pickup_locations"} {
		if _, err := tx.Exec(ctx, fmt.Sprintf("delete from %s where store_id = $1::uuid", tbl), storeID); err != nil {
			return fmt.Errorf("clean %s: %w", tbl, err)
		}
	}

	// --- Pickup location ---
	var locationID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_locations (store_id, label, address1, city, region, postal_code, country, timezone, lat, lng)
		values ($1::uuid, $2, $3, $4, $5, $6, 'US', $7, $8, $9)
		returning id::text
	`, storeID, f.location.label, f.location.address1, f.location.city, f.location.region, f.location.postal, f.location.timezone, f.location.lat, f.location.lng).Scan(&locationID); err != nil {
		return fmt.Errorf("location: %w", err)
	}

	// --- Products + images ---
	productIDs := make([]string, len(f.products))
	for i, p := range f.products {
		var productID string
		if err := tx.QueryRow(ctx, `
			insert into products (store_id, title, description, unit, is_perishable, is_active)
			values ($1::uuid, $2, $3, $4, true, true)
			returning id::text
		`, storeID, p.title, p.desc, p.unit).Scan(&productID); err != nil {
			return fmt.Errorf("product %d: %w", i, err)
		}
		productIDs[i] = productID

		if p.imageURL != "" {
			if _, err := tx.Exec(ctx, `
				insert into product_images (product_id, url, sort_order)
				values ($1::uuid, $2, 0)
			`, productID, p.imageURL); err != nil {
				return fmt.Errorf("product_image %d: %w", i, err)
			}
		}
	}

	// --- Pickup window (past, for completed orders) ---
	pastStart := time.Now().UTC().Add(-7 * 24 * time.Hour).Truncate(time.Hour)
	pastEnd := pastStart.Add(time.Duration(f.plan.durationMin) * time.Minute)
	pastCutoff := pastStart.Add(-time.Duration(f.plan.cutoffHours) * time.Hour)

	var pastWindowID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'completed', 'Past pickup for demo reviews.')
		returning id::text
	`, storeID, locationID, pastStart, pastEnd, pastCutoff).Scan(&pastWindowID); err != nil {
		return fmt.Errorf("past window: %w", err)
	}

	// --- Pickup window (upcoming, published) ---
	futureStart := time.Now().UTC().Add(48 * time.Hour).Truncate(time.Hour)
	futureEnd := futureStart.Add(time.Duration(f.plan.durationMin) * time.Minute)
	futureCutoff := futureStart.Add(-time.Duration(f.plan.cutoffHours) * time.Hour)

	var futureWindowID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'published', 'Upcoming pickup.')
		returning id::text
	`, storeID, locationID, futureStart, futureEnd, futureCutoff).Scan(&futureWindowID); err != nil {
		return fmt.Errorf("future window: %w", err)
	}

	// --- Offerings for both windows (use first product as the box product) ---
	boxProductID := productIDs[0]

	var pastOfferingID string
	if err := tx.QueryRow(ctx, `
		insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, 'active')
		returning id::text
	`, storeID, pastWindowID, boxProductID, f.plan.priceCents, f.plan.subLimit).Scan(&pastOfferingID); err != nil {
		return fmt.Errorf("past offering: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, 'active')
	`, storeID, futureWindowID, boxProductID, f.plan.priceCents, f.plan.subLimit); err != nil {
		return fmt.Errorf("future offering: %w", err)
	}

	// --- Subscription plan (use first product as box product) ---
	var planID string
	if err := tx.QueryRow(ctx, `
		insert into subscription_plans (
			store_id, pickup_location_id, product_id, title, description,
			cadence, price_cents, subscriber_limit, first_start_at,
			duration_minutes, cutoff_hours, is_active, is_live
		)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, true, true)
		returning id::text
	`, storeID, locationID, boxProductID, f.plan.title, f.plan.desc,
		f.plan.cadence, f.plan.priceCents, f.plan.subLimit, futureStart,
		f.plan.durationMin, f.plan.cutoffHours).Scan(&planID); err != nil {
		return fmt.Errorf("plan: %w", err)
	}

	// --- Subscription cycle for past window ---
	if _, err := tx.Exec(ctx, `
		insert into subscription_cycles (plan_id, store_id, pickup_window_id, start_at)
		values ($1::uuid, $2::uuid, $3::uuid, $4)
	`, planID, storeID, pastWindowID, pastStart); err != nil {
		return fmt.Errorf("past cycle: %w", err)
	}

	// --- Completed orders + reviews ---
	for _, rev := range f.reviews {
		var orderID string
		if err := tx.QueryRow(ctx, `
			insert into orders (
				store_id, pickup_window_id, buyer_email, buyer_name,
				status, payment_method, payment_status,
				subtotal_cents, total_cents
			)
			values ($1::uuid, $2::uuid, $3, $4, 'picked_up', 'pay_at_pickup', 'paid', $5, $5)
			returning id::text
		`, storeID, pastWindowID, rev.buyerEmail, rev.buyerName,
			f.plan.priceCents).Scan(&orderID); err != nil {
			return fmt.Errorf("order for review: %w", err)
		}

		// Order item
		if _, err := tx.Exec(ctx, `
			insert into order_items (order_id, offering_id, product_title, product_unit, price_cents, quantity, line_total_cents)
			values ($1::uuid, $2::uuid, $3, 'box', $4, 1, $4)
		`, orderID, pastOfferingID, f.plan.title, f.plan.priceCents); err != nil {
			return fmt.Errorf("order item: %w", err)
		}

		// Update offering reserved count
		if _, err := tx.Exec(ctx, `
			update offerings set quantity_reserved = quantity_reserved + 1 where id = $1::uuid
		`, pastOfferingID); err != nil {
			return fmt.Errorf("offering reserve: %w", err)
		}

		// Review
		if _, err := tx.Exec(ctx, `
			insert into reviews (order_id, store_id, rating, body)
			values ($1::uuid, $2::uuid, $3, $4)
		`, orderID, storeID, rev.rating, rev.body); err != nil {
			return fmt.Errorf("review: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}
