import { insertProductSchema, type InsertProduct, type Product } from "../../shared/schema";
import { DataCleanerService } from "./dataCleanerService";
import { paginationService } from "./paginationService";
import { BaseService } from "./baseService";

export class ProductService extends BaseService<Product, InsertProduct> {
  protected entityName = "Product";
  protected pluralName = "Products";
  protected storageMethodPrefix = "Product";
  protected insertSchema = insertProductSchema;
  protected updateSchema = insertProductSchema.partial();

  protected async validateImportData(data: unknown): Promise<InsertProduct> {
    const productData = data as Record<string, unknown>;
    const sanitizedData = DataCleanerService.sanitizeProductData(productData);
    
    return insertProductSchema.parse({
      name: sanitizedData.name,
      sku: sanitizedData.sku,
      price: parseFloat(sanitizedData.price) || 0,
      purchasePrice: parseFloat(sanitizedData.purchasePrice) || undefined,
      weight: parseFloat(sanitizedData.weight) || undefined,
      length: parseFloat(sanitizedData.length) || undefined,
      width: parseFloat(sanitizedData.width) || undefined,
      height: parseFloat(sanitizedData.height) || undefined,
      barcode: sanitizedData.barcode || undefined,
    });
  }

  // Специализированный метод пагинации для продуктов
  async getAllPaginated(params: Record<string, unknown>) {
    const normalizedParams = paginationService.normalizeParams(params);

    // Получаем все продукты через BaseService
    const allProducts = await this.getAll();
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
}

export const productService = new ProductService();
