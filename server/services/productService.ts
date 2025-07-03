import { storage } from "../storage";
import { insertProductSchema, type InsertProduct, type Product } from "../../shared/schema";
import { DataCleanerService } from "./dataCleanerService";
import { paginationService } from "./paginationService";
import { apiLogger } from "../../shared/logger";

export class ProductService {
  async getAll(): Promise<Product[]> {
    return await storage.getProducts();
  }

  // ✅ ИСПРАВЛЕНО: Типизация вместо any
  async getAllPaginated(params: Record<string, unknown>) {
    const normalizedParams = paginationService.normalizeParams(params);

    // Получаем все продукты (пока без SQL пагинации в storage)
    const allProducts = await storage.getProducts();
    const total = allProducts.length;

    // Применяем сортировку
    const sortedProducts = this.sortProducts(
      allProducts,
      normalizedParams.sort,
      normalizedParams.order
    );

    // Применяем пагинацию в памяти
    const startIndex = normalizedParams.offset;
    const endIndex = startIndex + normalizedParams.limit;
    const data = sortedProducts.slice(startIndex, endIndex);

    return paginationService.createResult(data, total, normalizedParams);
  }

  // ✅ ИСПРАВЛЕНО: Типизация вместо any
  private sortProducts(products: Product[], sortField: string, order: "asc" | "desc"): Product[] {
    return [...products].sort((a, b) => {
      let aValue: unknown = a[sortField as keyof Product];
      let bValue: unknown = b[sortField as keyof Product];

      // ✅ ИСПРАВЛЕНО: Правильная типизация
      if (sortField === "price" || sortField === "weight") {
        const aNum = parseFloat(String(aValue)) || 0;
        const bNum = parseFloat(String(bValue)) || 0;
        if (aNum < bNum) return order === "asc" ? -1 : 1;
        if (aNum > bNum) return order === "asc" ? 1 : -1;
        return 0;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (aStr < bStr) return order === "asc" ? -1 : 1;
        if (aStr > bStr) return order === "asc" ? 1 : -1;
      }
      return 0;
    });
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

  async deleteMultiple(
    ids: number[]
  ): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID товаров для удаления");
    }

    const validIds = ids.filter((id) => Number.isInteger(id) && id > 0);
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
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        apiLogger.error(`Error deleting product ${id}`, {
          productId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
      }
    }

    return { deletedCount, results };
  }

  // ✅ ИСПРАВЛЕНО: Типизация вместо any
  async import(products: Record<string, unknown>[]): Promise<Product[]> {
    if (!Array.isArray(products)) {
      throw new Error("Ожидается массив товаров");
    }

    const results = [];
    for (const productData of products) {
      try {
        const sanitizedData = DataCleanerService.sanitizeProductData(productData);
        
        // ✅ ИСПРАВЛЕНО: Преобразование строковых полей в правильные типы
        const validatedData: InsertProduct = {
          name: sanitizedData.name,
          sku: sanitizedData.sku,
          price: parseFloat(sanitizedData.price) || 0,
          purchasePrice: parseFloat(sanitizedData.purchasePrice) || undefined,
          weight: parseFloat(sanitizedData.weight) || undefined,
          length: parseFloat(sanitizedData.length) || undefined,
          width: parseFloat(sanitizedData.width) || undefined,
          height: parseFloat(sanitizedData.height) || undefined,
          barcode: sanitizedData.barcode || undefined,
        };

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
        apiLogger.error("Error importing product", {
          productData,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}

export const productService = new ProductService();
