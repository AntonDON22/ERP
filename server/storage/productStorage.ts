import { products, type Product, type InsertProduct } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { dbLogger } from "@shared/logger";

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
    const [product] = await db.insert(products).values(insertProduct).returning();
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
}
