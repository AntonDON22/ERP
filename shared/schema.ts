import { pgTable, text, serial, integer, boolean, decimal, varchar, index, numeric, timestamp } from "drizzle-orm/pg-core";
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

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
});

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  date: text("date"),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  createdAt: timestamp("created_at").defaultNow(),
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

// Гибкая схема для импорта Excel
export const importProductSchema = z.object({
  name: z.string().optional().transform(val => val && val.trim() ? val.trim() : "Без названия"),
  sku: z.string().optional().transform(val => val && val.trim() ? val.trim() : `SKU-${Date.now()}`),
  price: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d.,]/g, '').replace(',', '.') || "0" : "0"
  ),
  purchasePrice: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d.,]/g, '').replace(',', '.') || "" : ""
  ),
  weight: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d.,]/g, '').replace(',', '.') || "" : ""
  ),
  length: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d]/g, '') || "" : ""
  ),
  width: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d]/g, '') || "" : ""
  ),
  height: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? String(val).replace(/[^\d]/g, '') || "" : ""
  ),
  barcode: z.string().optional().transform(val => val && val.trim() ? val.trim() : ""),
  imageUrl: z.string().optional().transform(val => val && val.trim() ? val.trim() : ""),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Название обязательно"),
  website: z.string().optional().refine((val) => !val || val.startsWith('http'), "Вебсайт должен начинаться с http"),
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Название обязательно"),
  website: z.string().optional().refine((val) => !val || val.startsWith('http'), "Вебсайт должен начинаться с http"),
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Название обязательно"),
  address: z.string().optional(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Название обязательно"),
  type: z.string().optional(),
  date: z.string().optional(),
  warehouseId: z.number().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;

export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehouses.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentRecord = typeof documents.$inferSelect;

// Таблица складских движений (FIFO инвентарь)
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // положительное для прихода, отрицательное для расхода
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"), // закупочная цена (только для приходов)
  movementType: text("movement_type").notNull(), // 'IN' для прихода, 'OUT' для расхода
  documentId: integer("document_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Индексы для оптимизации FIFO-выборок
  productDateIdx: index("inventory_product_date_idx").on(table.productId, table.createdAt),
  productTypeIdx: index("inventory_product_type_idx").on(table.productId, table.movementType),
}));

// Таблица позиций документов оприходования
export const documentItems = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertDocumentItemSchema = createInsertSchema(documentItems).omit({
  id: true,
  documentId: true,
}).extend({
  productId: z.number().min(1, "Товар обязателен"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Количество должно быть больше 0"),
  price: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Некорректная цена"),
});

// Type for items when creating receipts (without documentId)
export type CreateDocumentItem = z.infer<typeof insertDocumentItemSchema>;

// Type for items with documentId (for full CRUD operations)  
export type InsertDocumentItem = CreateDocumentItem & { documentId?: number };
export type DocumentItem = typeof documentItems.$inferSelect;

export type Inventory = typeof inventory.$inferSelect;

// Схемы валидации для создания документов
export const documentItemSchema = z.object({
  productId: z.number().min(1, "Выберите товар"),
  quantity: z.number().min(0.01, "Количество должно быть больше 0"),
  price: z.number().min(0, "Цена не может быть отрицательной"),
});

export const receiptDocumentSchema = z.object({
  name: z.string().min(1, "Название документа обязательно"),
  date: z.string().min(1, "Дата документа обязательна"),
  warehouseId: z.number().min(1, "Выберите склад"),
  items: z.array(documentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Таблица заказов
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Новый"), // Новый, В работе, Выполнен, Отменен
  customerId: integer("customer_id"), // может быть контрагент
  warehouseId: integer("warehouse_id"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderDateIdx: index("orders_date_idx").on(table.date),
  orderStatusIdx: index("orders_status_idx").on(table.status),
}));

// Таблица позиций заказов
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  orderId: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type CreateOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertOrderItem = CreateOrderItem & { orderId?: number };
export type OrderItem = typeof orderItems.$inferSelect;

export const orderItemSchema = z.object({
  productId: z.number().min(1, "Товар обязателен"),
  quantity: z.number().min(1, "Количество должно быть больше 0"),
  price: z.number().min(0, "Цена не может быть отрицательной"),
});

export const orderSchema = z.object({
  customerId: z.number().optional(),
  warehouseId: z.number().min(1, "Склад обязателен"),
  status: z.string(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы один товар"),
});
