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
  status: text("status").notNull().default("draft"), // "draft" или "posted"
  date: text("date"),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  createdAt: timestamp("created_at").defaultNow(),
  postedAt: timestamp("posted_at"), // Время проведения документа
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
}).extend({
  name: z.string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim(),
  sku: z.string()
    .min(1, "Артикул обязателен")
    .max(100, "Артикул не должен превышать 100 символов")
    .regex(/^[A-Za-z0-9_-]+$/, "Артикул может содержать только буквы, цифры, дефисы и подчеркивания")
    .trim(),
  price: z.string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Цена должна быть положительным числом")
    .refine((val) => Number(val) <= 999999999.99, "Цена слишком большая"),
  purchasePrice: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Закупочная цена должна быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999999.99, "Закупочная цена слишком большая"),
  weight: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Вес должен быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999, "Вес слишком большой"),
  height: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Высота должна быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999, "Высота слишком большая"),
  width: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Ширина должна быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999, "Ширина слишком большая"),
  length: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Длина должна быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999, "Длина слишком большая"),
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
  name: z.string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine(val => val.length > 0, "Название не может быть пустым"),
  website: z.string()
    .optional()
    .refine((val) => !val || val.trim() === "" || val.startsWith('http'), "Вебсайт должен начинаться с http или https")
    .transform(val => val?.trim() || undefined),
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
}).extend({
  name: z.string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine(val => val.length > 0, "Название не может быть пустым"),
  website: z.string()
    .optional()
    .refine((val) => !val || val.trim() === "" || val.startsWith('http'), "Вебсайт должен начинаться с http или https")
    .transform(val => val?.trim() || undefined),
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
}).extend({
  name: z.string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine(val => val.length > 0, "Название не может быть пустым"),
  address: z.string()
    .optional()
    .transform(val => val?.trim() || undefined)
    .refine(val => !val || val.length <= 500, "Адрес не должен превышать 500 символов"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  postedAt: true,
}).extend({
  name: z.string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim(),
  type: z.enum(['Оприходование', 'Списание'], {
    errorMap: () => ({ message: "Тип документа должен быть 'Оприходование' или 'Списание'" })
  }),
  status: z.enum(['draft', 'posted'], {
    errorMap: () => ({ message: "Статус документа должен быть 'draft' или 'posted'" })
  }).default('draft'),
  date: z.string().optional(),
  warehouseId: z.number()
    .positive("ID склада должен быть положительным числом")
    .int("ID склада должен быть целым числом")
    .optional(),
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
  productId: z.number()
    .positive("ID продукта должен быть положительным")
    .int("ID продукта должен быть целым числом"),
  quantity: z.string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Количество должно быть положительным числом")
    .refine((val) => Number(val) <= 999999, "Количество слишком большое")
    .refine((val) => Number.isInteger(Number(val)), "Количество должно быть целым числом"),
  price: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Цена должна быть положительным числом")
    .refine((val) => !val || Number(val) <= 999999999.99, "Цена слишком большая"),
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
  isReserved: boolean("is_reserved").notNull().default(false), // резерв товаров
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
}).extend({
  name: z.string()
    .min(1, "Название заказа обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim(),
  status: z.enum(['Новый', 'В работе', 'Выполнен', 'Отменен'], {
    errorMap: () => ({ message: "Некорректный статус заказа" })
  }),
  customerId: z.number()
    .positive("ID клиента должен быть положительным")
    .int("ID клиента должен быть целым числом")
    .optional(),
  warehouseId: z.number()
    .positive("ID склада должен быть положительным")
    .int("ID склада должен быть целым числом"),
  totalAmount: z.string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Сумма должна быть положительным числом")
    .refine((val) => Number(val) <= 999999999.99, "Сумма слишком большая"),
  notes: z.string()
    .optional()
    .refine(val => !val || val.length <= 1000, "Примечания не должны превышать 1000 символов")
    .transform(val => val?.trim() || undefined),
  date: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), "Некорректная дата"),
  isReserved: z.boolean().optional(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  orderId: true,
}).extend({
  productId: z.number()
    .positive("ID продукта должен быть положительным")
    .int("ID продукта должен быть целым числом"),
  quantity: z.number()
    .positive("Количество должно быть положительным")
    .max(999999, "Количество слишком большое")
    .int("Количество должно быть целым числом"),
  price: z.string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Цена должна быть положительным числом")
    .refine((val) => Number(val) <= 999999999.99, "Цена слишком большая"),
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
  isReserved: z.boolean().optional(),
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Таблица резервов товаров
export const reserves = pgTable("reserves", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reserveOrderIdx: index("reserves_order_idx").on(table.orderId),
  reserveProductIdx: index("reserves_product_idx").on(table.productId),
  reserveWarehouseIdx: index("reserves_warehouse_idx").on(table.warehouseId),
}));
