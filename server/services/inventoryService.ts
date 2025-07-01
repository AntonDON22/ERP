import { storage } from "../storage";

export class InventoryService {
  async getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    return await storage.getInventory(warehouseId);
  }

  async getInventoryAvailability(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number; reserved: number; available: number}>> {
    // Эта логика будет перенесена из routes.ts
    const inventoryData = await storage.getInventory(warehouseId);
    
    // TODO: Здесь будет логика расчета резервов
    // Пока возвращаем базовые данные
    return inventoryData.map(item => ({
      ...item,
      reserved: 0,
      available: item.quantity
    }));
  }
}

export const inventoryService = new InventoryService();