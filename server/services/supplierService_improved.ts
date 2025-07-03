import { BaseService } from "./baseService";
import { Supplier, InsertSupplier, insertSupplierSchema } from "../../shared/schema";
import { z } from "zod";

/**
 * 🏢 SupplierService - сервис управления поставщиками
 * 
 * Наследует от BaseService все стандартные CRUD операции
 * с типизацией, валидацией и логированием
 */
export class SupplierService extends BaseService<Supplier, InsertSupplier> {
  protected entityName = "Supplier";
  protected pluralName = "Suppliers";
  protected storageMethodPrefix = "supplier";
  
  // Схемы валидации
  protected insertSchema = insertSupplierSchema;
  protected updateSchema = insertSupplierSchema.partial();

  /**
   * 📦 Валидация данных для импорта поставщиков
   */
  protected async validateImportData(data: any): Promise<InsertSupplier> {
    // Дополнительная бизнес-логика валидации для поставщиков
    const validated = this.insertSchema.parse(data);
    
    // Можно добавить специфичные для поставщиков проверки
    if (validated.website && !validated.website.startsWith('http')) {
      validated.website = `https://${validated.website}`;
    }
    
    return validated;
  }

  /**
   * 🔍 Поиск поставщиков по названию или сайту
   */
  async search(query: string): Promise<Supplier[]> {
    const startTime = Date.now();
    
    try {
      const allSuppliers = await this.getAll();
      const lowercaseQuery = query.toLowerCase();
      
      const results = allSuppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(lowercaseQuery) ||
        (supplier.website && supplier.website.toLowerCase().includes(lowercaseQuery))
      );
      
      const stats = this.getOperationStats('search', startTime, true);
      console.log('Supplier search completed:', { ...stats, resultsCount: results.length, query });
      
      return results;
    } catch (error) {
      this.handleError('search', error, { query });
    }
  }

  /**
   * 📊 Статистика поставщиков
   */
  async getStats(): Promise<{
    total: number;
    withWebsite: number;
    withoutWebsite: number;
  }> {
    const startTime = Date.now();
    
    try {
      const suppliers = await this.getAll();
      
      const stats = {
        total: suppliers.length,
        withWebsite: suppliers.filter(s => s.website).length,
        withoutWebsite: suppliers.filter(s => !s.website).length,
      };
      
      const operationStats = this.getOperationStats('getStats', startTime, true);
      console.log('Supplier stats generated:', { ...operationStats, stats });
      
      return stats;
    } catch (error) {
      this.handleError('getStats', error);
    }
  }
}

export const supplierService = new SupplierService();