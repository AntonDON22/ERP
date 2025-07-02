import {
  users,
  products,
  suppliers,
  contractors,
  documents,
  inventory,
  documentItems,
  warehouses,
  logs,
  orders,
  orderItems,
  reserves,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Supplier,
  type InsertSupplier,
  type Contractor,
  type InsertContractor,
  type DocumentRecord,
  type InsertDocument,
  type DocumentItem,
  type CreateDocumentItem,
  type Inventory,
  type Warehouse,
  type InsertWarehouse,
  type Log,
  type Order,
  type InsertOrder,
  type OrderItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, asc, or, isNull, inArray } from "drizzle-orm";
import { getMoscowTime } from "../shared/timeUtils";
import { dbLogger, inventoryLogger, getErrorMessage } from "@shared/logger";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Inventory
  getInventory(
    warehouseId?: number
  ): Promise<Array<{ id: number; name: string; quantity: number }>>;

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

  // Contractors
  getContractors(): Promise<Contractor[]>;
  getContractor(id: number): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(
    id: number,
    contractor: Partial<InsertContractor>
  ): Promise<Contractor | undefined>;
  deleteContractor(id: number): Promise<boolean>;

  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<DocumentRecord[]>;
  getDocument(id: number): Promise<DocumentRecord | undefined>;
  createDocument(document: InsertDocument): Promise<DocumentRecord>;
  updateDocument(
    id: number,
    document: Partial<InsertDocument>
  ): Promise<DocumentRecord | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Receipt Documents with FIFO
  createReceiptDocument(
    document: InsertDocument,
    items: CreateDocumentItem[]
  ): Promise<DocumentRecord>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;

  // Logs
  getLogs(params: {
    level?: string;
    module?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<Log[]>;
  getLogModules(): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private suppliers: Map<number, Supplier>;
  private contractors: Map<number, Contractor>;
  private warehouses: Map<number, Warehouse>;
  private currentUserId: number;
  private currentProductId: number;
  private currentSupplierId: number;
  private currentContractorId: number;
  private currentWarehouseId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.suppliers = new Map();
    this.contractors = new Map();
    this.warehouses = new Map();
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentSupplierId = 1;
    this.currentContractorId = 1;
    this.currentWarehouseId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, role: "user" };
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
    return Array.from(this.products.values()).find((product) => product.sku === sku);
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
      barcode: insertProduct.barcode || null,
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(
    id: number,
    updateData: Partial<InsertProduct>
  ): Promise<Product | undefined> {
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

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = this.currentSupplierId++;
    const supplier: Supplier = {
      ...insertSupplier,
      id,
      website: insertSupplier.website || null,
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(
    id: number,
    updateData: Partial<InsertSupplier>
  ): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) {
      return undefined;
    }

    const updatedSupplier: Supplier = {
      ...supplier,
      ...updateData,
      id,
    };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  // Contractors methods
  async getContractors(): Promise<Contractor[]> {
    return Array.from(this.contractors.values());
  }

  async getContractor(id: number): Promise<Contractor | undefined> {
    return this.contractors.get(id);
  }

  async createContractor(insertContractor: InsertContractor): Promise<Contractor> {
    const id = this.currentContractorId++;
    const contractor: Contractor = {
      ...insertContractor,
      website: insertContractor.website || null,
      id,
    };
    this.contractors.set(id, contractor);
    return contractor;
  }

  async updateContractor(
    id: number,
    updateData: Partial<InsertContractor>
  ): Promise<Contractor | undefined> {
    const existingContractor = this.contractors.get(id);
    if (!existingContractor) return undefined;

    const updatedContractor: Contractor = {
      ...existingContractor,
      ...updateData,
      id,
    };
    this.contractors.set(id, updatedContractor);
    return updatedContractor;
  }

  async deleteContractor(id: number): Promise<boolean> {
    return this.contractors.delete(id);
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values());
  }

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.currentWarehouseId++;
    const warehouse: Warehouse = {
      ...insertWarehouse,
      id,
      address: insertWarehouse.address || null,
    };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }

  async updateWarehouse(
    id: number,
    updateData: Partial<InsertWarehouse>
  ): Promise<Warehouse | undefined> {
    const existingWarehouse = this.warehouses.get(id);
    if (!existingWarehouse) return undefined;

    const updatedWarehouse: Warehouse = {
      ...existingWarehouse,
      ...updateData,
      id,
    };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    return this.warehouses.delete(id);
  }

  // Document methods - not implemented in MemStorage
  async getDocuments(): Promise<DocumentRecord[]> {
    return [];
  }

  async getDocument(id: number): Promise<DocumentRecord | undefined> {
    return undefined;
  }

  async createDocument(document: InsertDocument): Promise<DocumentRecord> {
    throw new Error("Documents not supported in MemStorage");
  }

  async updateDocument(
    id: number,
    document: Partial<InsertDocument>
  ): Promise<DocumentRecord | undefined> {
    return undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return false;
  }

  async getInventory(
    warehouseId?: number
  ): Promise<Array<{ id: number; name: string; quantity: number }>> {
    const allProducts = Array.from(this.products.values());
    return allProducts.map((product) => ({
      id: product.id,
      name: product.name,
      quantity: 0, // MemStorage doesn't support real inventory tracking
    }));
  }

  async createReceiptDocument(
    document: InsertDocument,
    items: CreateDocumentItem[]
  ): Promise<DocumentRecord> {
    throw new Error("Receipt documents not supported in MemStorage");
  }

  async getLogs(params: any): Promise<Log[]> {
    return []; // MemStorage doesn't support logs
  }

  async getLogModules(): Promise<string[]> {
    return []; // MemStorage doesn't support logs
  }

  async getOrders(): Promise<Order[]> {
    return []; // MemStorage doesn't support orders
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return undefined; // MemStorage doesn't support orders
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    throw new Error("Orders not supported in MemStorage");
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    throw new Error("Orders not supported in MemStorage");
  }

  async deleteOrder(id: number): Promise<boolean> {
    throw new Error("Orders not supported in MemStorage");
  }
}

export class DatabaseStorage implements IStorage {
  async getInventory(
    warehouseId?: number
  ): Promise<Array<{ id: number; name: string; quantity: number }>> {
    const endOperation = dbLogger.startOperation("getInventory", { warehouseId });

    try {
      console.log("[DB] Starting getInventory query...");
      let result;

      // Попытка использовать материализованное представление для лучшей производительности
      try {
        if (warehouseId) {
          // Для конкретного склада используем материализованное представление с фильтром
          result = await db.execute(sql`
            SELECT 
              p.id::int as id,
              p.name as name,
              COALESCE(iv.quantity, 0)::decimal as quantity
            FROM products p
            LEFT JOIN inventory_summary iv ON p.id = iv.id
            ORDER BY p.id
          `);
        } else {
          // Без фильтра по складу - используем оптимизированное представление
          result = await db.execute(sql`
            SELECT 
              p.id::int as id,
              p.name as name,
              COALESCE(SUM(iv.quantity), 0)::decimal as quantity
            FROM products p
            LEFT JOIN inventory_summary iv ON p.id = iv.id
            GROUP BY p.id, p.name
            ORDER BY p.id
          `);
        }
        dbLogger.info("Материализованное представление использовано для getInventory", {
          warehouseId,
          rowCount: result.rows?.length || 0,
        });
      } catch (materializedError) {
        dbLogger.warn(
          "Материализованное представление недоступно, fallback к стандартному запросу",
          {
            error: getErrorMessage(materializedError),
          }
        );

        // Fallback к стандартному запросу
        if (warehouseId) {
          result = await db
            .select({
              id: products.id,
              name: products.name,
              quantity: sql<number>`
                COALESCE(
                  SUM(
                    CASE 
                      WHEN (documents.warehouse_id = ${warehouseId} OR documents.warehouse_id IS NULL) 
                           AND documents.status = 'posted'
                      THEN CAST(inventory.quantity AS DECIMAL)
                      ELSE 0 
                    END
                  ), 0
                )
              `.as("quantity"),
            })
            .from(products)
            .leftJoin(inventory, eq(products.id, inventory.productId))
            .leftJoin(documents, eq(inventory.documentId, documents.id))
            .groupBy(products.id, products.name);
        } else {
          result = await db
            .select({
              id: products.id,
              name: products.name,
              quantity: sql<number>`
                COALESCE(
                  SUM(
                    CASE 
                      WHEN documents.status = 'posted' 
                      THEN CAST(inventory.quantity AS DECIMAL)
                      ELSE 0 
                    END
                  ), 0
                )
              `.as("quantity"),
            })
            .from(products)
            .leftJoin(inventory, eq(products.id, inventory.productId))
            .leftJoin(documents, eq(inventory.documentId, documents.id))
            .groupBy(products.id, products.name);
        }
      }

      // Преобразуем результат в унифицированный формат
      const resultData = Array.isArray(result) ? result : (result as any).rows || [];
      const mappedResult = resultData.map((item: any) => ({
        id: Number(item.id),
        name: String(item.name),
        quantity: Number(item.quantity) || 0,
      }));

      console.log(
        `[DB] getInventory completed in ${endOperation()}ms, returned ${mappedResult.length} items`
      );
      return mappedResult;
    } catch (error) {
      dbLogger.error("Error in getInventory", { error: getErrorMessage(error), warehouseId });
      endOperation();
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    const endOperation = dbLogger.startOperation("getProducts");
    try {
      const result = await db.select().from(products);
      endOperation();
      return result;
    } catch (error) {
      dbLogger.error("Error in getProducts", { error: getErrorMessage(error) });
      endOperation();
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
    // Очистка числовых полей от символов валюты и единиц
    const cleanNumericValue = (value: string | null | undefined): string | null => {
      if (!value || value === "") return null;
      const cleaned = String(value)
        .replace(/[^\d.,]/g, "") // Удаляем все кроме цифр, точек и запятых
        .replace(",", ".") // Заменяем запятые на точки
        .trim();
      return cleaned || null;
    };

    const cleanedProduct = {
      ...insertProduct,
      price: cleanNumericValue(insertProduct.price) || "0",
      purchasePrice: cleanNumericValue(insertProduct.purchasePrice),
      weight: cleanNumericValue(insertProduct.weight),
      length: cleanNumericValue(insertProduct.length),
      width: cleanNumericValue(insertProduct.width),
      height: cleanNumericValue(insertProduct.height),
    };

    const [product] = await db.insert(products).values(cleanedProduct).returning();
    return product;
  }

  async updateProduct(
    id: number,
    updateData: Partial<InsertProduct>
  ): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const startTime = Date.now();
    console.log("[DB] Starting getSuppliers query...");

    try {
      const result = await db.select().from(suppliers);
      const endTime = Date.now();
      console.log(
        `[DB] getSuppliers completed in ${endTime - startTime}ms, returned ${result.length} suppliers`
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getSuppliers failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(
    id: number,
    updateData: Partial<InsertSupplier>
  ): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier || undefined;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getContractors(): Promise<Contractor[]> {
    console.log(`[DB] Starting getContractors query...`);
    const startTime = Date.now();

    try {
      const result = await db.select().from(contractors);
      const endTime = Date.now();
      console.log(
        `[DB] getContractors completed in ${endTime - startTime}ms, returned ${result.length} contractors`
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getContractors failed in ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async getContractor(id: number): Promise<Contractor | undefined> {
    const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id));
    return contractor || undefined;
  }

  async createContractor(insertContractor: InsertContractor): Promise<Contractor> {
    const [contractor] = await db.insert(contractors).values(insertContractor).returning();
    return contractor;
  }

  async updateContractor(
    id: number,
    updateData: Partial<InsertContractor>
  ): Promise<Contractor | undefined> {
    const [contractor] = await db
      .update(contractors)
      .set(updateData)
      .where(eq(contractors.id, id))
      .returning();
    return contractor || undefined;
  }

  async deleteContractor(id: number): Promise<boolean> {
    const result = await db.delete(contractors).where(eq(contractors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const startTime = Date.now();
    console.log("[DB] Starting getWarehouses query...");

    try {
      const result = await db.select().from(warehouses);
      const endTime = Date.now();
      console.log(
        `[DB] getWarehouses completed in ${endTime - startTime}ms, returned ${result.length} warehouses`
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getWarehouses failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse || undefined;
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const [warehouse] = await db.insert(warehouses).values(insertWarehouse).returning();
    return warehouse;
  }

  async updateWarehouse(
    id: number,
    updateData: Partial<InsertWarehouse>
  ): Promise<Warehouse | undefined> {
    const [warehouse] = await db
      .update(warehouses)
      .set(updateData)
      .where(eq(warehouses.id, id))
      .returning();
    return warehouse || undefined;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    const result = await db.delete(warehouses).where(eq(warehouses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Documents
  async getDocuments(): Promise<DocumentRecord[]> {
    const startTime = Date.now();
    console.log("[DB] Starting getDocuments query...");

    try {
      // Получаем все документы
      const documentsResult = await db.select().from(documents);

      // Получаем все позиции документов для загруженных документов
      const documentIds = documentsResult.map(doc => doc.id);
      let allItems: any[] = [];
      
      if (documentIds.length > 0) {
        allItems = await db
          .select()
          .from(documentItems)
          .where(inArray(documentItems.documentId, documentIds));
      }

      // Группируем позиции по документам
      const itemsByDocument = allItems.reduce((acc, item) => {
        if (!acc[item.documentId]) {
          acc[item.documentId] = [];
        }
        acc[item.documentId].push({
          id: item.id,
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        });
        return acc;
      }, {} as Record<number, any[]>);

      // Собираем документы с позициями
      const result = documentsResult.map(document => ({
        ...document,
        items: itemsByDocument[document.id] || [],
      })) as any[];

      const endTime = Date.now();
      console.log(
        `[DB] getDocuments completed in ${endTime - startTime}ms, returned ${result.length} documents with items`
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getDocuments failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async getDocument(id: number): Promise<DocumentRecord | undefined> {
    console.log(`[DB] Starting getDocument for ID ${id}...`);
    const startTime = Date.now();

    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));

      if (!document) {
        console.log(`[DB] Document ${id} not found`);
        return undefined;
      }

      // Получаем элементы документа
      const items = await db.select().from(documentItems).where(eq(documentItems.documentId, id));

      const endTime = Date.now();
      console.log(
        `[DB] getDocument completed in ${endTime - startTime}ms for document ${id} with ${items.length} items`
      );

      // Возвращаем документ с элементами
      return {
        ...document,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
      } as any;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getDocument failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<DocumentRecord> {
    // Сначала создаем документ без имени, чтобы получить ID
    const [document] = await db.insert(documents).values(insertDocument).returning();

    // Генерируем название в формате "Тип+ID"
    const name = `${document.type}${document.id}`;

    // Обновляем документ с сгенерированным названием
    const [updatedDocument] = await db
      .update(documents)
      .set({ name })
      .where(eq(documents.id, document.id))
      .returning();

    return updatedDocument;
  }

  async updateDocument(
    id: number,
    updateData: Partial<InsertDocument>
  ): Promise<DocumentRecord | undefined> {
    try {
      return await db.transaction(async (tx) => {
        // Получаем текущий документ для сравнения статуса
        const [currentDocument] = await tx.select().from(documents).where(eq(documents.id, id));

        if (!currentDocument) {
          return undefined;
        }

        // Автоматически устанавливаем время изменения
        const updatePayload = {
          ...updateData,
          updatedAt: new Date(),
        };

        const [updatedDocument] = await tx
          .update(documents)
          .set(updatePayload)
          .where(eq(documents.id, id))
          .returning();

        if (!updatedDocument) {
          return undefined;
        }

        // Обрабатываем изменение статуса документа
        const oldStatus = currentDocument.status;
        const newStatus = updatedDocument.status;

        if (oldStatus !== newStatus) {
          // Получаем элементы документа для работы с инвентарем
          const items = await tx
            .select()
            .from(documentItems)
            .where(eq(documentItems.documentId, id));

          if (oldStatus === "posted" && newStatus === "draft") {
            // Документ был проведен, теперь черновик - отменяем движения инвентаря
            await tx.delete(inventory).where(eq(inventory.documentId, id));
            console.log(`📝 Документ ${id} переведен в черновик, движения инвентаря отменены`);
          } else if (oldStatus === "draft" && newStatus === "posted") {
            // Документ был черновиком, теперь проведен - создаем движения инвентаря
            for (const item of items) {
              if (updatedDocument.type === "income") {
                await tx.insert(inventory).values({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  movementType: "IN",
                  documentId: id,
                });
              } else if (updatedDocument.type === "outcome") {
                await this.processWriteoffFIFO(
                  tx,
                  item.productId,
                  Number(item.quantity),
                  item.price,
                  id
                );
              }
            }
            console.log(`✅ Документ ${id} проведен, движения инвентаря созданы`);
          }
        }

        return updatedDocument;
      });
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  }

  async deleteDocument(id: number): Promise<boolean> {
    console.log(`[DB] Starting deleteDocument for ID ${id}...`);
    const startTime = Date.now();

    try {
      // Сначала удаляем связанные записи из inventory
      const inventoryResult = await db.delete(inventory).where(eq(inventory.documentId, id));
      console.log(
        `[DB] Deleted ${inventoryResult.rowCount ?? 0} inventory records for document ${id}`
      );

      // Затем удаляем связанные записи из document_items
      const itemsResult = await db.delete(documentItems).where(eq(documentItems.documentId, id));
      console.log(`[DB] Deleted ${itemsResult.rowCount ?? 0} document items for document ${id}`);

      // Наконец удаляем сам документ
      const documentResult = await db.delete(documents).where(eq(documents.id, id));

      const endTime = Date.now();
      const success = (documentResult.rowCount ?? 0) > 0;
      console.log(`[DB] deleteDocument completed in ${endTime - startTime}ms, success: ${success}`);

      return success;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] deleteDocument failed in ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async createReceiptDocument(
    document: InsertDocument,
    items: CreateDocumentItem[]
  ): Promise<DocumentRecord> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Создаем документ
        const [createdDocument] = await tx.insert(documents).values(document).returning();

        // 1.1. Генерируем название в формате "Тип день.месяц-номер" (по московскому времени)
        const moscowTime = getMoscowTime();
        const today = moscowTime.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "Europe/Moscow",
        });

        // Получаем количество документов данного типа за сегодня (по московскому времени)
        const todayStart = getMoscowTime();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = getMoscowTime();
        todayEnd.setHours(23, 59, 59, 999);

        const todayDocuments = await tx
          .select()
          .from(documents)
          .where(
            sql`${documents.type} = ${createdDocument.type} AND ${documents.createdAt} >= ${todayStart.toISOString()} AND ${documents.createdAt} <= ${todayEnd.toISOString()}`
          );

        const dayNumber = todayDocuments.length;

        // Преобразуем тип документа в русское название
        const typeNames = {
          income: "Оприходование",
          outcome: "Списание",
          return: "Возврат",
        };
        const typeName =
          typeNames[createdDocument.type as keyof typeof typeNames] || createdDocument.type;
        const name = `${typeName} ${today}-${dayNumber}`;

        const [updatedDocument] = await tx
          .update(documents)
          .set({ name })
          .where(eq(documents.id, createdDocument.id))
          .returning();

        // 2. Создаем позиции документа
        for (const item of items) {
          await tx.insert(documentItems).values({
            productId: item.productId,
            quantity: item.quantity.toString(),
            price: item.price ?? "0",
            documentId: createdDocument.id,
          });

          // 3. Обрабатываем движения инвентаря по FIFO только для проведенных документов
          if (updatedDocument.status === "posted") {
            if (updatedDocument.type === "income") {
              // Приход товара - просто добавляем запись
              await tx.insert(inventory).values({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                movementType: "IN",
                documentId: createdDocument.id,
              });
            } else if (updatedDocument.type === "outcome") {
              // Списание товара - используем FIFO логику
              await this.processWriteoffFIFO(
                tx,
                item.productId,
                Number(item.quantity),
                item.price ?? "0",
                createdDocument.id
              );
            }
          }
        }

        return updatedDocument;
      });
    } catch (error) {
      console.error("Error creating receipt document:", error);
      throw error;
    }
  }

  // Метод для обработки списания по FIFO
  private async processWriteoffFIFO(
    tx: any,
    productId: number,
    quantityToWriteoff: number,
    writeoffPrice: string,
    documentId: number
  ): Promise<void> {
    console.log(`🔄 FIFO-списание товара ${productId}, количество: ${quantityToWriteoff}`);

    // 1. Получаем все приходы товара в порядке FIFO (по дате создания)
    const availableStock = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.movementType, "IN")))
      .orderBy(asc(inventory.createdAt));

    console.log(`📦 Найдено приходов: ${availableStock.length}`);

    let remainingToWriteoff = quantityToWriteoff;

    // 2. Списываем из самых старых партий - оптимизированно через batch insert
    const writeoffEntries = [];
    for (const stockItem of availableStock) {
      if (remainingToWriteoff <= 0) break;

      const availableQuantity = Number(stockItem.quantity);
      const quantityToTakeFromThisBatch = Math.min(remainingToWriteoff, availableQuantity);

      if (quantityToTakeFromThisBatch > 0) {
        writeoffEntries.push({
          productId: productId,
          quantity: `-${quantityToTakeFromThisBatch}`,
          price: stockItem.price,
          movementType: "OUT" as const,
          documentId: documentId,
        });

        remainingToWriteoff -= quantityToTakeFromThisBatch;
        console.log(
          `📤 Списано ${quantityToTakeFromThisBatch} из партии ${stockItem.id}, остается списать: ${remainingToWriteoff}`
        );
      }
    }

    // Выполняем batch insert для всех списаний
    if (writeoffEntries.length > 0) {
      await tx.insert(inventory).values(writeoffEntries);
    }

    // 3. Если остались несписанные товары - создаем запись о списании в минус
    if (remainingToWriteoff > 0) {
      console.log(`⚠️ Списание в минус: ${remainingToWriteoff} единиц`);

      await tx.insert(inventory).values({
        productId: productId,
        quantity: `-${remainingToWriteoff}`,
        price: writeoffPrice, // Используем цену из документа списания
        movementType: "OUT",
        documentId: documentId,
      });
    }

    console.log(`✅ FIFO-списание завершено`);
  }

  // Методы для работы с логами
  async getLogs(params: {
    level?: string;
    module?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<Log[]> {
    try {
      let query = db.select().from(logs).$dynamic();

      // Применяем фильтры
      const conditions = [];

      if (params.level) {
        conditions.push(eq(logs.level, params.level));
      }

      if (params.module) {
        conditions.push(eq(logs.module, params.module));
      }

      if (params.from) {
        conditions.push(sql`${logs.timestamp} >= ${params.from}`);
      }

      if (params.to) {
        conditions.push(sql`${logs.timestamp} <= ${params.to}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Сортировка по дате (новые сверху)
      query = query.orderBy(sql`${logs.timestamp} DESC`);

      // Пагинация
      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.offset(params.offset);
      }

      return await query;
    } catch (error) {
      console.error("Error fetching logs:", error);
      throw error;
    }
  }

  async getLogModules(): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ module: logs.module })
        .from(logs)
        .orderBy(logs.module);

      return result.map((row) => row.module);
    } catch (error) {
      console.error("Error fetching log modules:", error);
      throw error;
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      // Получаем все заказы
      const ordersResult = await db.select().from(orders).orderBy(orders.createdAt);

      // Получаем все позиции заказов для загруженных заказов
      const orderIds = ordersResult.map(order => order.id);
      let allItems: any[] = [];
      
      if (orderIds.length > 0) {
        allItems = await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds));
      }

      // Группируем позиции по заказам
      const itemsByOrder = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) {
          acc[item.orderId] = [];
        }
        acc[item.orderId].push({
          id: item.id,
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        });
        return acc;
      }, {} as Record<number, any[]>);

      // Собираем заказы с позициями
      const result = ordersResult.map(order => ({
        ...order,
        items: itemsByOrder[order.id] || [],
      })) as any[];

      return result;
    } catch (error) {
      dbLogger.error("Error in getOrders", { error: getErrorMessage(error) });
      throw error;
    }
  }

  async getOrder(id: number): Promise<Order | undefined> {
    try {
      const result = await db.select().from(orders).where(eq(orders.id, id));
      return result[0] || undefined;
    } catch (error) {
      dbLogger.error("Error in getOrder", { error: getErrorMessage(error), id });
      throw error;
    }
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    try {
      // Гарантируем что обязательные поля заполнены
      const orderData = {
        ...insertOrder,
        date: insertOrder.date || getMoscowTime().toISOString().split("T")[0],
        createdAt: getMoscowTime(),
        updatedAt: getMoscowTime(),
      };

      const [order] = await db.insert(orders).values(orderData).returning();
      return order;
    } catch (error) {
      dbLogger.error("Error in createOrder", { error: getErrorMessage(error), order: insertOrder });
      throw error;
    }
  }

  async updateOrder(id: number, updateData: Partial<InsertOrder>): Promise<Order | undefined> {
    try {
      const [order] = await db
        .update(orders)
        .set({ ...updateData, updatedAt: getMoscowTime() })
        .where(eq(orders.id, id))
        .returning();
      return order || undefined;
    } catch (error) {
      dbLogger.error("Error in updateOrder", { error: getErrorMessage(error), id, updateData });
      throw error;
    }
  }

  async deleteOrder(id: number): Promise<boolean> {
    try {
      // Сначала удаляем связанные записи
      await db.delete(orderItems).where(eq(orderItems.orderId, id));
      await db.delete(reserves).where(eq(reserves.orderId, id));

      const result = await db.delete(orders).where(eq(orders.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      dbLogger.error("Error in deleteOrder", { error: getErrorMessage(error), id });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
