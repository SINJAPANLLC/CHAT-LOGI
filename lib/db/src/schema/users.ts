import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("user"),
  billingAddress: text("billing_address"),
  cardHolderName: text("card_holder_name"),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  cardExpiry: text("card_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
