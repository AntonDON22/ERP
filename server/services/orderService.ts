import { storage } from "../storage";
import { insertOrderSchema, insertOrderItemSchema, type InsertOrder, type Order, type CreateOrderItem } from "../../shared/schema";
import { transactionService } from "./transactionService";

export class OrderService {
  async getAll(): Promise<Order[]> {
    // TODO: Реализовать getOrders в storage
    // Пока используем прямой запрос к БД
    return [];
  }

  async getById(id: number): Promise<Order | undefined> {
    // TODO: Реализовать getOrder в storage  
    // Пока используем прямой запрос к БД
    return undefined;
  }

  async create(orderData: InsertOrder, items: CreateOrderItem[], isReserved: boolean = false): Promise<Order> {
    const validatedOrder = insertOrderSchema.parse(orderData);
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
        console.error(`Error deleting order ${id}:`, error);
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