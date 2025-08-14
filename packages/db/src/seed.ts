import { db, newId, users, farms, csaShares, subscriptions } from "./index";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function seed() {
  console.log("🌱 Seeding the database...");

  // Create a test user (this would normally be handled by Clerk)
  const testUserId = "user_" + Math.random().toString(36).substring(2, 15);
  await db.insert(users).values({
    id: testUserId,
  }).onConflictDoNothing();

  console.log(`Created test user: ${testUserId}`);

  // Create a sample farm
  const farmId = newId("farm");
  await db.insert(farms).values({
    id: farmId,
    userId: testUserId,
    name: "Green Valley Farm",
    description: "A family-owned farm specializing in organic vegetables and fruits.",
    address: "123 Farm Road",
    city: "Farmville",
    state: "CA",
    zipCode: "95555",
    latitude: "37.7749",
    longitude: "-122.4194",
    imageUrls: ["https://images.unsplash.com/photo-1500076656116-558758c991c1"],
  }).onConflictDoNothing();

  console.log(`Created sample farm: ${farmId}`);

  // Create sample CSA shares
  const shareId1 = newId("share");
  const shareId2 = newId("share");

  await db.insert(csaShares).values([
    {
      id: shareId1,
      farmId: farmId,
      name: "Summer Vegetable Share",
      description: "Weekly box of seasonal vegetables from our organic farm.",
      price: 2500, // $25.00
      frequency: "weekly",
      available: true,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2023-08-31"),
      maxSubscribers: 50,
    },
    {
      id: shareId2,
      farmId: farmId,
      name: "Fruit Share",
      description: "Bi-weekly box of seasonal fruits.",
      price: 3000, // $30.00
      frequency: "biweekly",
      available: true,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2023-09-30"),
      maxSubscribers: 30,
    },
  ]).onConflictDoNothing();

  console.log(`Created sample CSA shares: ${shareId1}, ${shareId2}`);

  // Create a sample subscription
  const subscriptionId = newId("sub");
  await db.insert(subscriptions).values({
    id: subscriptionId,
    userId: testUserId,
    shareId: shareId1,
    status: "active",
    startDate: new Date(),
    nextDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  }).onConflictDoNothing();

  console.log(`Created sample subscription: ${subscriptionId}`);

  console.log("✅ Seeding complete!");
}

// Run the seed function
seed()
  .catch((e) => {
    console.error("❌ Error seeding the database:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  }); 