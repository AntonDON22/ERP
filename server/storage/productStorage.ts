import { products, type Product, type InsertProduct } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { dbLogger } from "@shared/logger";
import { toStringForDB } from "@shared/utils";

export class ProductStorage {
  async getProducts(): Promise<Product[]> {
    dbLogger.debug("Starting: getProducts");
    const startTime = Date.now();

    const result = await db.select().from(products);

    const duration = Date.now() - startTime;
    dbLogger.info(`Performance: getProducts (${duration}ms)`);

    return result;
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
    // Преобразуем числовые поля в строки для БД
    const cleanedProduct = {
      ...insertProduct,
      price: toStringForDB(insertProduct.price),
      purchasePrice: insertProduct.purchasePrice ? toStringForDB(insertProduct.purchasePrice) : null,
      weight: insertProduct.weight ? toStringForDB(insertProduct.weight) : null,
      length: insertProduct.length ? toStringForDB(insertProduct.length) : null,
      width: insertProduct.width ? toStringForDB(insertProduct.width) : null,
      height: insertProduct.height ? toStringForDB(insertProduct.height) : null,
    };
    const [product] = await db.insert(products).values(cleanedProduct).returning();
    return product;
  }

  async updateProduct(
    id: number,
    updateData: Partial<InsertProduct>
  ): Promise<Product | undefined> {
    // Преобразуем числовые поля в строки для БД
    const cleanedUpdateData: any = { ...updateData };
    if (updateData.price !== undefined) {
      cleanedUpdateData.price = toStringForDB(updateData.price);
    }
    if (updateData.purchasePrice !== undefined) {
      cleanedUpdateData.purchasePrice = updateData.purchasePrice ? toStringForDB(updateData.purchasePrice) : null;
    }
    if (updateData.weight !== undefined) {
      cleanedUpdateData.weight = updateData.weight ? toStringForDB(updateData.weight) : null;
    }
    if (updateData.length !== undefined) {
      cleanedUpdateData.length = updateData.length ? toStringForDB(updateData.length) : null;
    }
    if (updateData.width !== undefined) {
      cleanedUpdateData.width = updateData.width ? toStringForDB(updateData.width) : null;
    }
    if (updateData.height !== undefined) {
      cleanedUpdateData.height = updateData.height ? toStringForDB(updateData.height) : null;
    }

    const [product] = await db
      .update(products)
      .set(cleanedUpdateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
