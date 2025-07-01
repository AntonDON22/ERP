import { users, products, suppliers, contractors, documents, inventory, documentItems, warehouses, type User, type InsertUser, type Product, type InsertProduct, type Supplier, type InsertSupplier, type Contractor, type InsertContractor, type DocumentRecord, type InsertDocument, type DocumentItem, type CreateDocumentItem, type Inventory, type Warehouse, type InsertWarehouse } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, asc, or, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Inventory
  getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>>;
  
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
  updateContractor(id: number, contractor: Partial<InsertContractor>): Promise<Contractor | undefined>;
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
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<DocumentRecord | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Receipt Documents with FIFO
  createReceiptDocument(document: InsertDocument, items: CreateDocumentItem[]): Promise<DocumentRecord>;
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
      website: insertSupplier.website || null
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
      id 
    };
    this.contractors.set(id, contractor);
    return contractor;
  }

  async updateContractor(id: number, updateData: Partial<InsertContractor>): Promise<Contractor | undefined> {
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
      address: insertWarehouse.address || null
    };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }

  async updateWarehouse(id: number, updateData: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
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

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<DocumentRecord | undefined> {
    return undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return false;
  }

  async getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    const allProducts = Array.from(this.products.values());
    return allProducts.map(product => ({
      id: product.id,
      name: product.name,
      quantity: 0 // MemStorage doesn't support real inventory tracking
    }));
  }

  async createReceiptDocument(document: InsertDocument, items: CreateDocumentItem[]): Promise<DocumentRecord> {
    throw new Error("Receipt documents not supported in MemStorage");
  }
}

export class DatabaseStorage implements IStorage {
  async getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    console.log(`[DB] Starting getInventory query${warehouseId ? ` for warehouse ${warehouseId}` : ''}...`);
    const startTime = Date.now();
    
    try {
      let result;
      
      if (warehouseId) {
        // Если указан склад, фильтруем по складу через documents
        result = await db
          .select({
            id: products.id,
            name: products.name,
            quantity: sql<number>`
              COALESCE(
                SUM(
                  CASE 
                    WHEN documents.warehouse_id = ${warehouseId} OR documents.warehouse_id IS NULL 
                    THEN inventory.quantity 
                    ELSE 0 
                  END
                ), 0
              )
            `.as('quantity')
          })
          .from(products)
          .leftJoin(inventory, eq(products.id, inventory.productId))
          .leftJoin(documents, eq(inventory.documentId, documents.id))
          .groupBy(products.id, products.name);
      } else {
        // Без фильтра по складу - показываем все остатки
        result = await db
          .select({
            id: products.id,
            name: products.name,
            quantity: sql<number>`COALESCE(SUM(${inventory.quantity}), 0)`.as('quantity')
          })
          .from(products)
          .leftJoin(inventory, eq(products.id, inventory.productId))
          .groupBy(products.id, products.name);
      }
      
      const endTime = Date.now();
      console.log(`[DB] getInventory completed in ${endTime - startTime}ms, returned ${result.length} items${warehouseId ? ` for warehouse ${warehouseId}` : ''}`);
      
      // Преобразуем результат, чтобы количество было числом
      return result.map(item => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity) || 0
      }));
    } catch (error) {
      console.error(`[DB] getInventory error:`, error);
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
    // Очистка числовых полей от символов валюты и единиц
    const cleanNumericValue = (value: string | null | undefined): string | null => {
      if (!value || value === "") return null;
      const cleaned = String(value)
        .replace(/[^\d.,]/g, '') // Удаляем все кроме цифр, точек и запятых
        .replace(',', '.') // Заменяем запятые на точки
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



    const [product] = await db
      .insert(products)
      .values(cleanedProduct)
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

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const startTime = Date.now();
    console.log('[DB] Starting getSuppliers query...');
    
    try {
      const result = await db.select().from(suppliers);
      const endTime = Date.now();
      console.log(`[DB] getSuppliers completed in ${endTime - startTime}ms, returned ${result.length} suppliers`);
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

  async getContractors(): Promise<Contractor[]> {
    console.log(`[DB] Starting getContractors query...`);
    const startTime = Date.now();
    
    try {
      const result = await db.select().from(contractors);
      const endTime = Date.now();
      console.log(`[DB] getContractors completed in ${endTime - startTime}ms, returned ${result.length} contractors`);
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
    const [contractor] = await db
      .insert(contractors)
      .values(insertContractor)
      .returning();
    return contractor;
  }

  async updateContractor(id: number, updateData: Partial<InsertContractor>): Promise<Contractor | undefined> {
    const [contractor] = await db
      .update(contractors)
      .set(updateData)
      .where(eq(contractors.id, id))
      .returning();
    return contractor || undefined;
  }

  async deleteContractor(id: number): Promise<boolean> {
    const result = await db
      .delete(contractors)
      .where(eq(contractors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const startTime = Date.now();
    console.log('[DB] Starting getWarehouses query...');
    
    try {
      const result = await db.select().from(warehouses);
      const endTime = Date.now();
      console.log(`[DB] getWarehouses completed in ${endTime - startTime}ms, returned ${result.length} warehouses`);
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
    const [warehouse] = await db
      .insert(warehouses)
      .values(insertWarehouse)
      .returning();
    return warehouse;
  }

  async updateWarehouse(id: number, updateData: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [warehouse] = await db
      .update(warehouses)
      .set(updateData)
      .where(eq(warehouses.id, id))
      .returning();
    return warehouse || undefined;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    const result = await db
      .delete(warehouses)
      .where(eq(warehouses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Documents
  async getDocuments(): Promise<DocumentRecord[]> {
    const startTime = Date.now();
    console.log('[DB] Starting getDocuments query...');
    
    try {
      const result = await db.select().from(documents);
      const endTime = Date.now();
      console.log(`[DB] getDocuments completed in ${endTime - startTime}ms, returned ${result.length} documents`);
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
      const items = await db
        .select()
        .from(documentItems)
        .where(eq(documentItems.documentId, id));

      const endTime = Date.now();
      console.log(`[DB] getDocument completed in ${endTime - startTime}ms for document ${id} with ${items.length} items`);
      
      // Возвращаем документ с элементами
      return {
        ...document,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      } as any;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DB] getDocument failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<DocumentRecord> {
    // Сначала создаем документ без имени, чтобы получить ID
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    
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

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<DocumentRecord | undefined> {
    const [document] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    console.log(`[DB] Starting deleteDocument for ID ${id}...`);
    const startTime = Date.now();
    
    try {
      // Сначала удаляем связанные записи из inventory
      const inventoryResult = await db
        .delete(inventory)
        .where(eq(inventory.documentId, id));
      console.log(`[DB] Deleted ${inventoryResult.rowCount ?? 0} inventory records for document ${id}`);

      // Затем удаляем связанные записи из document_items  
      const itemsResult = await db
        .delete(documentItems)
        .where(eq(documentItems.documentId, id));
      console.log(`[DB] Deleted ${itemsResult.rowCount ?? 0} document items for document ${id}`);

      // Наконец удаляем сам документ
      const documentResult = await db
        .delete(documents)
        .where(eq(documents.id, id));
      
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

  async createReceiptDocument(document: InsertDocument, items: CreateDocumentItem[]): Promise<DocumentRecord> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Создаем документ
        const [createdDocument] = await tx
          .insert(documents)
          .values(document)
          .returning();

        // 1.1. Генерируем название в формате "Тип+ID"
        const name = `${createdDocument.type}${createdDocument.id}`;
        const [updatedDocument] = await tx
          .update(documents)
          .set({ name })
          .where(eq(documents.id, createdDocument.id))
          .returning();

        // 2. Создаем позиции документа
        for (const item of items) {
          await tx
            .insert(documentItems)
            .values({
              ...item,
              documentId: createdDocument.id,
            });

          // 3. Обрабатываем движения инвентаря по FIFO
          if (updatedDocument.type === 'Оприходование') {
            // Приход товара - просто добавляем запись
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                movementType: 'IN',
                documentId: createdDocument.id,
              });
          } else if (updatedDocument.type === 'Списание') {
            // Списание товара - используем FIFO логику
            await this.processWriteoffFIFO(tx, item.productId, Number(item.quantity), item.price ?? "0", createdDocument.id);
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
      .where(and(
        eq(inventory.productId, productId),
        eq(inventory.movementType, 'IN')
      ))
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
          movementType: 'OUT' as const,
          documentId: documentId,
        });

        remainingToWriteoff -= quantityToTakeFromThisBatch;
        console.log(`📤 Списано ${quantityToTakeFromThisBatch} из партии ${stockItem.id}, остается списать: ${remainingToWriteoff}`);
      }
    }

    // Выполняем batch insert для всех списаний
    if (writeoffEntries.length > 0) {
      await tx.insert(inventory).values(writeoffEntries);
    }

    // 3. Если остались несписанные товары - создаем запись о списании в минус
    if (remainingToWriteoff > 0) {
      console.log(`⚠️ Списание в минус: ${remainingToWriteoff} единиц`);
      
      await tx
        .insert(inventory)
        .values({
          productId: productId,
          quantity: `-${remainingToWriteoff}`,
          price: writeoffPrice, // Используем цену из документа списания
          movementType: 'OUT',
          documentId: documentId,
        });
    }

    console.log(`✅ FIFO-списание завершено`);
  }
}

export const storage = new DatabaseStorage();
