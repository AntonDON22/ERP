import { users, products, suppliers, type User, type InsertUser, type Product, type InsertProduct, type Supplier, type InsertSupplier } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

interface SystemUpdate {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  description: string;
  timestamp: string;
  category: string;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // System Updates
  getSystemUpdates(): Promise<SystemUpdate[]>;
  addSystemUpdate(update: Omit<SystemUpdate, 'id' | 'timestamp'>): Promise<SystemUpdate>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private suppliers: Map<number, Supplier>;
  private systemUpdates: SystemUpdate[];
  private currentUserId: number;
  private currentProductId: number;
  private currentSupplierId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.suppliers = new Map();
    this.systemUpdates = [];
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentSupplierId = 1;
    
    // Добавляем начальные системные обновления
    this.initializeSystemUpdates();
  }

  private initializeSystemUpdates() {
    const now = new Date().toISOString();
    this.systemUpdates = [
      {
        id: "1",
        type: "success",
        title: "Система ERP+CRM запущена",
        description: "Система управления товарами и поставщиками успешно инициализирована",
        timestamp: now,
        category: "Система"
      },
      {
        id: "2", 
        type: "info",
        title: "База данных подключена",
        description: "Установлено соединение с PostgreSQL базой данных",
        timestamp: now,
        category: "База данных"
      },
      {
        id: "3",
        type: "success",
        title: "Модули активированы",
        description: "Модули товаров и поставщиков готовы к использованию",
        timestamp: now,
        category: "Функциональность"
      }
    ];
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort((a, b) => a.id - b.id);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.sku === sku,
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { 
      ...insertProduct, 
      id,
      price: insertProduct.price || "0",
      purchasePrice: insertProduct.purchasePrice || null,
      weight: insertProduct.weight || null,
      length: insertProduct.length || null,
      width: insertProduct.width || null,
      height: insertProduct.height || null,
      imageUrl: insertProduct.imageUrl || null,
      barcode: insertProduct.barcode || null,
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) {
      return undefined;
    }

    const updatedProduct: Product = { 
      ...product, 
      ...updateData,
      id, // Ensure ID doesn't change
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async getSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).sort((a, b) => a.id - b.id);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = this.currentSupplierId++;
    const supplier: Supplier = { 
      ...insertSupplier, 
      id,
      website: insertSupplier.website ?? null
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: number, updateData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) {
      return undefined;
    }

    const updatedSupplier: Supplier = { 
      ...supplier, 
      ...updateData,
      id, // Ensure ID doesn't change
    };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  async getSystemUpdates(): Promise<SystemUpdate[]> {
    return [...this.systemUpdates].reverse(); // Новые обновления сверху
  }

  async addSystemUpdate(update: Omit<SystemUpdate, 'id' | 'timestamp'>): Promise<SystemUpdate> {
    const newUpdate: SystemUpdate = {
      ...update,
      id: (this.systemUpdates.length + 1).toString(),
      timestamp: new Date().toISOString()
    };
    this.systemUpdates.push(newUpdate);
    return newUpdate;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    const startTime = Date.now();
    console.log('[DB] Starting getProducts query...');
    
    try {
      const result = await db.select().from(products);
      const endTime = Date.now();
      console.log(`[DB] getProducts completed in ${endTime - startTime}ms, returned ${result.length} products`);
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getProducts failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliers)
      .values(insertSupplier)
      .returning();
    return supplier;
  }

  async updateSupplier(id: number, updateData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier || undefined;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSystemUpdates(): Promise<SystemUpdate[]> {
    // В реальной базе данных здесь бы был запрос к таблице system_updates
    // Пока возвращаем статичные данные
    const now = new Date().toISOString();
    return [
      {
        id: "1",
        type: "success",
        title: "База данных PostgreSQL активна",
        description: "Система работает с постоянным хранилищем данных",
        timestamp: now,
        category: "База данных"
      },
      {
        id: "2",
        type: "info", 
        title: "Модуль товаров готов",
        description: "Загружено товаров в базе данных для управления",
        timestamp: now,
        category: "Товары"
      },
      {
        id: "3",
        type: "success",
        title: "Модуль поставщиков активен",
        description: "Система управления поставщиками с полем веб-сайта",
        timestamp: now,
        category: "Поставщики"
      }
    ];
  }

  async addSystemUpdate(update: Omit<SystemUpdate, 'id' | 'timestamp'>): Promise<SystemUpdate> {
    // В реальной базе данных здесь бы был INSERT в таблицу system_updates
    const newUpdate: SystemUpdate = {
      ...update,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    return newUpdate;
  }
}

export const storage = new DatabaseStorage();
