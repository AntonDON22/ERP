import { pgTable, text, serial, integer, boolean, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  barcode: varchar("barcode", { length: 50 }),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  length: decimal("length", { precision: 8, scale: 1 }),
  width: decimal("width", { precision: 8, scale: 1 }),
  height: decimal("height", { precision: 8, scale: 1 }),
  imageUrl: text("image_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Название обязательно"),
  sku: z.string().min(1, "Артикул обязателен"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Некорректная цена"),
  purchasePrice: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректная цена закупки"),
  weight: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректный вес"),
  length: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректная длина"),
  width: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректная ширина"),
  height: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректная высота"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
