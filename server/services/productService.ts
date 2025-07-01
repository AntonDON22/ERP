import { storage } from "../storage";
import { insertProductSchema, type InsertProduct, type Product } from "../../shared/schema";
import { DataCleanerService } from "./dataCleanerService";

export class ProductService {
  async getAll(): Promise<Product[]> {
    return await storage.getProducts();
  }

  async getById(id: number): Promise<Product | undefined> {
    return await storage.getProduct(id);
  }

  async create(data: InsertProduct): Promise<Product> {
    const validatedData = insertProductSchema.parse(data);
    return await storage.createProduct(validatedData);
  }

  async update(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const validatedData = insertProductSchema.partial().parse(data);
    return await storage.updateProduct(id, validatedData);
  }

  async delete(id: number): Promise<boolean> {
    return await storage.deleteProduct(id);
  }

  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID товаров для удаления");
    }

    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID товаров");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await storage.deleteProduct(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: 'deleted' });
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        console.error(`Error deleting product ${id}:`, error);
        results.push({ id, status: 'error' });
      }
    }

    return { deletedCount, results };
  }

  async import(products: any[]): Promise<Product[]> {
    if (!Array.isArray(products)) {
      throw new Error("Ожидается массив товаров");
    }

    const results = [];
    for (const productData of products) {
      try {
        const validatedData = DataCleanerService.sanitizeProductData(productData);
        
        // Проверяем наличие ID для обновления
        const id = productData.ID || productData.id;
        let product;
        
        if (id && Number.isInteger(Number(id))) {
          const numericId = Number(id);
          // Обновляем существующий товар
          product = await storage.updateProduct(numericId, validatedData);
          if (!product) {
            // Если товар с таким ID не найден, создаем нового
            product = await storage.createProduct(validatedData);
          }
        } else {
          // Создаем новый товар
          product = await storage.createProduct(validatedData);
        }
        
        results.push(product);
      } catch (error) {
        console.error('Error importing product:', productData, error);
      }
    }

    return results;
  }
}

export const productService = new ProductService();