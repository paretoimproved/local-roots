import { pgTable, text, varchar, timestamp, boolean, integer, serial, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Create the users table reference (assuming it's already set up with Clerk)
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create frequency enum for CSA shares
export const frequencyEnum = pgEnum("frequency", ["weekly", "biweekly", "monthly"]);

// Create status enum for subscriptions
export const statusEnum = pgEnum("status", ["active", "paused", "cancelled"]);

// Create farms table
export const farms = pgTable("farms", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create CSA shares table
export const csaShares = pgTable("csa_shares", {
  id: varchar("id", { length: 255 }).primaryKey(),
  farmId: varchar("farm_id", { length: 255 })
    .notNull()
    .references(() => farms.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // price in cents
  frequency: frequencyEnum("frequency").notNull(),
  available: boolean("available").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxSubscribers: integer("max_subscribers"),
  currentSubscribers: integer("current_subscribers").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  shareId: varchar("share_id", { length: 255 })
    .notNull()
    .references(() => csaShares.id),
  status: statusEnum("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  nextDeliveryDate: timestamp("next_delivery_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types
export type User = InferSelectModel<typeof users>;
export type Farm = InferSelectModel<typeof farms>;
export type CsaShare = InferSelectModel<typeof csaShares>;
export type Subscription = InferSelectModel<typeof subscriptions>;

export type NewFarm = InferInsertModel<typeof farms>;
export type NewCsaShare = InferInsertModel<typeof csaShares>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;

// Create Zod schemas for validation
export const farmInsertSchema = createInsertSchema(farms).omit({ userId: true });
export const farmSelectSchema = createSelectSchema(farms);

export const csaShareInsertSchema = createInsertSchema(csaShares);
export const csaShareSelectSchema = createSelectSchema(csaShares);

export const subscriptionInsertSchema = createInsertSchema(subscriptions);
export const subscriptionSelectSchema = createSelectSchema(subscriptions); 