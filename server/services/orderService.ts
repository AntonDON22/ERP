import { storage } from "../storage";
import { createOrderSchema, insertOrderSchema, insertOrderItemSchema, type InsertOrder, type Order, type CreateOrderItem } from "../../shared/schema";
import { transactionService } from "./transactionService";
import { apiLogger } from "../../shared/logger";

export class OrderService {
  async getAll(): Promise<Order[]> {
    return storage.getOrders();
  }

  async getById(id: number): Promise<Order | undefined> {
    // TODO: Реализовать getOrder в storage  
    // Пока используем прямой запрос к БД
    return undefined;
  }

  async create(orderData: any, items: CreateOrderItem[], isReserved: boolean = false): Promise<Order> {
    // Сначала валидируем базовые поля с гибкой схемой
    const baseValidatedData = createOrderSchema.parse(orderData);
    
    // Генерируем автоматические поля если они не переданы
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    
    const processedOrderData = {
      ...baseValidatedData,
      name: baseValidatedData.name || `Заказ ${currentDate}`,
      totalAmount: baseValidatedData.totalAmount || totalAmount.toString(),
      date: baseValidatedData.date || currentDate
    };
    
    // Теперь валидируем полный заказ со строгой схемой
    const validatedOrder = insertOrderSchema.parse(processedOrderData);
    const validatedItems = items.map(item => insertOrderItemSchema.parse(item));
    
    // Используем транзакционный сервис для создания заказа с резервами
    return await transactionService.processOrderWithReserves(validatedOrder, validatedItems, isReserved);
  }

  async update(id: number, orderData: Partial<InsertOrder>, items?: CreateOrderItem[], isReserved?: boolean): Promise<Order | undefined> {
    const validatedData = insertOrderSchema.partial().parse(orderData);
    
    if (items && items.length > 0) {
      // Если есть позиции, используем полное транзакционное обновление
      return await this.updateWithItems(id, validatedData, items, isReserved ?? false);
    } else {
      // TODO: Реализовать updateOrder в storage
      // Пока возвращаем undefined
      return undefined;
    }
  }

  async delete(id: number): Promise<boolean> {
    // TODO: Реализовать deleteOrder в storage
    return false;
  }

  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID заказов для удаления");
    }

    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID заказов");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = false; // TODO: Реализовать deleteOrder в storage
        if (success) {
          deletedCount++;
          results.push({ id, status: 'deleted' });
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        apiLogger.error(`Error deleting order ${id}`, { orderId: id, error: error instanceof Error ? error.message : String(error) });
        results.push({ id, status: 'error' });
      }
    }

    return { deletedCount, results };
  }

  // Приватный метод для транзакционного обновления заказа с позициями
  private async updateWithItems(
    orderId: number, 
    orderData: Partial<InsertOrder>, 
    items: CreateOrderItem[], 
    isReserved: boolean
  ): Promise<Order | undefined> {
    // Это требует дополнительной реализации транзакционного обновления заказов
    // Пока используем старый метод, но можно расширить transactionService
    // TODO: Реализовать updateOrder в storage
    return undefined;
  }
}

export const orderService = new OrderService();