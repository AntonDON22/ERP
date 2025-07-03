import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  decimal,
  varchar,
  index,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  zPrice,
  zQuantity,
  zQuantityInteger,
  zWeight,
  zId,
  zName,
  zNameOptional,
  zDocumentName,
  zNotes,
  zDate,
  zOrderStatus,
  zOrderStatusOptional,
} from "./zFields";

// Enum для типов документов
export const documentTypeEnum = pgEnum("document_type_enum", ["income", "outcome", "return"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // admin, manager, user
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  barcode: varchar("barcode", { length: 50 }),
  weight: numeric("weight", { precision: 8, scale: 3 }),
  length: numeric("length", { precision: 8, scale: 1 }),
  width: numeric("width", { precision: 8, scale: 1 }),
  height: numeric("height", { precision: 8, scale: 1 }),
  // Убрано неиспользуемое поле imageUrl
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
  type: documentTypeEnum("type").notNull().default("income"),
  status: text("status").notNull().default("draft"), // "draft" или "posted"
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Убираем неиспользуемые поля:
  // date - дублирует createdAt
  // postedAt - не используется в логике системы
});

export const insertUserSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const insertProductSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim(),
  sku: z
    .string()
    .min(1, "Артикул обязателен")
    .max(100, "Артикул не должен превышать 100 символов")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Артикул может содержать только буквы, цифры, дефисы и подчеркивания"
    )
    .trim(),
  barcode: z.string().optional(),
  price: zPrice,
  purchasePrice: zPrice.optional(),
  weight: zWeight.optional(),
  height: zWeight.optional(),
  width: zWeight.optional(),
  length: zWeight.optional(),
  imageUrl: z.string().optional(),
});

// Гибкая схема для импорта Excel
export const importProductSchema = z.object({
  name: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : "Без названия")),
  sku: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : `SKU-${Date.now()}`)),
  price: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) =>
      val
        ? String(val)
            .replace(/[^\d.,]/g, "")
            .replace(",", ".") || "0"
        : "0"
    ),
  purchasePrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) =>
      val
        ? String(val)
            .replace(/[^\d.,]/g, "")
            .replace(",", ".") || ""
        : ""
    ),
  weight: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) =>
      val
        ? String(val)
            .replace(/[^\d.,]/g, "")
            .replace(",", ".") || ""
        : ""
    ),
  length: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? String(val).replace(/[^\d]/g, "") || "" : "")),
  width: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? String(val).replace(/[^\d]/g, "") || "" : "")),
  height: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? String(val).replace(/[^\d]/g, "") || "" : "")),
  barcode: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : "")),
});

export const insertSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine((val) => val.length > 0, "Название не может быть пустым"),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || val.startsWith("http"),
      "Вебсайт должен начинаться с http или https"
    )
    .transform((val) => val?.trim() || undefined),
});

export const insertContractorSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine((val) => val.length > 0, "Название не может быть пустым"),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || val.startsWith("http"),
      "Вебсайт должен начинаться с http или https"
    )
    .transform((val) => val?.trim() || undefined),
});

export const insertWarehouseSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .refine((val) => val.length > 0, "Название не может быть пустым"),
  address: z
    .string()
    .optional()
    .transform((val) => val?.trim() || undefined)
    .refine((val) => !val || val.length <= 500, "Адрес не должен превышать 500 символов"),
});

export const insertDocumentSchema = z.object({
  name: z
    .string()
    .max(255, "Название не должно превышать 255 символов")
    .trim()
    .optional()
    .default(""),
  type: z.enum(["income", "outcome", "return"], {
    errorMap: () => ({ message: "Тип документа должен быть 'income', 'outcome' или 'return'" }),
  }),
  status: z
    .enum(["draft", "posted"], {
      errorMap: () => ({ message: "Статус документа должен быть 'draft' или 'posted'" }),
    })
    .default("draft"),
  warehouseId: zId.optional(),
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
export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(), // положительное для прихода, отрицательное для расхода
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"), // закупочная цена (только для приходов)
    movementType: text("movement_type").notNull(), // 'IN' для прихода, 'OUT' для расхода
    documentId: integer("document_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Индексы для оптимизации FIFO-выборок
    productDateIdx: index("inventory_product_date_idx").on(table.productId, table.createdAt),
    productTypeIdx: index("inventory_product_type_idx").on(table.productId, table.movementType),
  })
);

// Таблица позиций документов оприходования
export const documentItems = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

// КРИТИЧЕСКИ ВАЖНО: Данная схема использует поля из zFields.ts для единообразной валидации.
// НЕ изменяйте вручную правила валидации — только через zFields.
// Эта схема используется для записи в БД через Drizzle ORM.
export const insertDocumentItemSchema = z.object({
  productId: zId,
  quantity: zQuantity,
  price: zPrice.optional(),
});

// Type for items when creating receipts (without documentId)
export type CreateDocumentItem = z.infer<typeof insertDocumentItemSchema>;

// Type for items with documentId (for full CRUD operations)
export type InsertDocumentItem = CreateDocumentItem & { documentId?: number };
export type DocumentItem = typeof documentItems.$inferSelect;

export type Inventory = typeof inventory.$inferSelect;

// ВАЖНО: Схемы валидации для создания документов используют поля из zFields.ts
// НЕ изменяйте вручную правила валидации — только через zFields.
export const documentItemSchema = z.object({
  productId: zId,
  quantity: zQuantity,
  price: zPrice.optional(), // Опциональное поле для документов списания
});

export const receiptDocumentSchema = z.object({
  type: z.enum(["income", "outcome", "return"], {
    errorMap: () => ({ message: "Тип документа должен быть 'income', 'outcome' или 'return'" }),
  }),
  status: z.enum(["draft", "posted"], {
    errorMap: () => ({ message: "Статус документа должен быть 'draft' или 'posted'" }),
  }),
  name: zDocumentName, // Поддерживает пустые значения для автогенерации
  warehouseId: zId,
  items: z.array(documentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Таблица заказов
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Новый"), // Новый, В работе, Выполнен, Отменен
    customerId: integer("customer_id"), // может быть контрагент
    warehouseId: integer("warehouse_id"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    isReserved: boolean("is_reserved").notNull().default(false), // резерв товаров
    date: text("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderDateIdx: index("orders_date_idx").on(table.date),
    orderStatusIdx: index("orders_status_idx").on(table.status),
  })
);

// Таблица позиций заказов
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

// ✅ Схема для создания заказов - использует централизованные поля zFields.ts
export const createOrderSchema = z.object({
  name: zNameOptional, // ✅ Мигрировано на централизованное поле
  status: zOrderStatusOptional, // ✅ Мигрировано на централизованное поле (опционально)
  customerId: zId.optional(),
  warehouseId: zId,
  totalAmount: zPrice.optional(),
  notes: zNotes, // ✅ Мигрировано на централизованное поле
  date: zDate, // ✅ Мигрировано на централизованное поле
  isReserved: z.boolean().optional(),
});

// ✅ Схема для полного заказа - использует централизованные поля zFields.ts
export const insertOrderSchema = createOrderSchema.extend({
  name: zName, // ✅ Мигрировано на централизованное поле (обязательно)
  status: zOrderStatus, // ✅ Обязательное поле без дефолта (обрабатывается в сервисе)
  totalAmount: zPrice,
  isReserved: z.boolean().default(false), // Обязательное поле с дефолтом
});

export const insertOrderItemSchema = z.object({
  productId: zId,
  quantity: zQuantityInteger,
  price: zPrice,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type CreateOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertOrderItem = CreateOrderItem & { orderId?: number };
export type OrderItem = typeof orderItems.$inferSelect;

// ВАЖНО: Данная схема должна использовать поля из zFields.ts.
// НЕ изменяйте вручную правила валидации — только через zFields.
export const orderItemSchema = z.object({
  productId: zId,
  quantity: zQuantityInteger,
  price: zPrice,
});

// ✅ Схема заказа - использует централизованные поля zFields.ts
export const orderSchema = z.object({
  customerId: zId, // Обязательное поле - контрагент должен быть выбран
  warehouseId: zId,
  status: zOrderStatus, // ✅ Мигрировано на централизованное поле
  isReserved: z.boolean().optional(),
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Таблица резервов товаров
export const reserves = pgTable(
  "reserves",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    warehouseId: integer("warehouse_id").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reserveOrderIdx: index("reserves_order_idx").on(table.orderId),
    reserveProductIdx: index("reserves_product_idx").on(table.productId),
    reserveWarehouseIdx: index("reserves_warehouse_idx").on(table.warehouseId),
  })
);

// Таблица логов системы
export const logs = pgTable(
  "logs",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    level: text("level").notNull(), // DEBUG, INFO, WARN, ERROR
    message: text("message").notNull(),
    module: text("module").notNull(), // api, database, inventory, etc.
    details: text("details"), // JSON string для дополнительных данных
  },
  (table) => ({
    timestampIdx: index("logs_timestamp_idx").on(table.timestamp),
    levelIdx: index("logs_level_idx").on(table.level),
    moduleIdx: index("logs_module_idx").on(table.module),
  })
);

// Схемы валидации для логов
export const insertLogSchema = z.object({
  level: z.string(),
  service: z.string(),
  message: z.string(),
  meta: z.record(z.any()).optional(),
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;
