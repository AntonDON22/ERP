import { storage } from "../storage";
import {
  createOrderSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  type InsertOrder,
  type Order,
  type CreateOrderItem,
  reserves,
} from "../../shared/schema";
import { transactionService } from "./transactionService";
import { apiLogger } from "../../shared/logger";
import { cacheService } from "./cacheService";
import { db } from "../db";
import { eq } from "drizzle-orm";

export class OrderService {
  async getAll(): Promise<Order[]> {
    return storage.getOrders();
  }

  async getById(id: number): Promise<Order | undefined> {
    return storage.getOrder(id);
  }

  async create(
    orderData: any,
    items: CreateOrderItem[],
    isReserved: boolean = false
  ): Promise<Order> {
    // Сначала валидируем базовые поля с гибкой схемой
    const baseValidatedData = createOrderSchema.parse(orderData);

    // Генерируем автоматические поля если они не переданы
    const currentDate = new Date().toLocaleDateString("ru-RU");
    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    const processedOrderData = {
      ...baseValidatedData,
      name: baseValidatedData.name || `Заказ ${currentDate}`,
      status: baseValidatedData.status || "Новый",
      totalAmount: baseValidatedData.totalAmount || totalAmount.toString(),
      date: baseValidatedData.date || currentDate,
      isReserved: isReserved,
    };

    // Теперь валидируем полный заказ со строгой схемой
    const validatedOrder = insertOrderSchema.parse(processedOrderData);
    const validatedItems = items.map((item) => insertOrderItemSchema.parse(item));

    // Используем транзакционный сервис для создания заказа с резервами
    return await transactionService.processOrderWithReserves(
      validatedOrder,
      validatedItems,
      isReserved
    );
  }

  async update(
    id: number,
    orderData: Partial<InsertOrder>,
    items?: CreateOrderItem[],
    isReserved?: boolean
  ): Promise<Order | undefined> {
    const validatedData = insertOrderSchema.partial().parse(orderData);

    // Получаем текущий заказ для сравнения резервирования
    const currentOrder = await storage.getOrder(id);
    if (!currentOrder) {
      return undefined;
    }

    // Проверяем нужно ли изменить резервирование
    const currentReserved = currentOrder.isReserved || false;
    const newReserved = isReserved ?? currentReserved;
    const reserveChanged = currentReserved !== newReserved;

    apiLogger.info("Order update analysis", {
      orderId: id,
      currentReserved,
      newReserved,
      reserveChanged,
      hasItems: !!items && items.length > 0,
    });

    if (items && items.length > 0) {
      // Если есть позиции, используем полное транзакционное обновление
      return await this.updateWithItems(id, validatedData, items, newReserved);
    } else if (reserveChanged) {
      // Если изменился только статус резервирования (без новых позиций)
      return await this.handleReservationChange(id, validatedData, newReserved, currentOrder);
    } else {
      // Простое обновление заказа без изменения позиций и резервирования
      const result = await storage.updateOrder(id, validatedData);

      // Инвалидация кеша остатков после обновления заказа
      if (result) {
        await cacheService.invalidatePattern("inventory:*");
        apiLogger.info("Order updated without reserve changes", { orderId: id });
      }

      return result;
    }
  }

  async delete(id: number): Promise<boolean> {
    // Используем storage.deleteOrder который корректно удаляет резервы
    const result = await storage.deleteOrder(id);

    // Инвалидация кеша остатков после удаления заказа с резервами
    if (result) {
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Inventory cache invalidated after order deletion", { orderId: id });
    }

    return result;
  }

  async deleteMultiple(
    ids: number[]
  ): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID заказов для удаления");
    }

    const validIds = ids.filter((id) => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID заказов");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await this.delete(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        apiLogger.error(`Error deleting order ${id}`, {
          orderId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
      }
    }

    // Дополнительная инвалидация кеша если было удалено несколько заказов
    if (deletedCount > 0) {
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Inventory cache invalidated after multiple order deletion", { deletedCount });
    }

    return { deletedCount, results };
  }

  // Приватный метод для обновления только статуса резервирования
  private async handleReservationChange(
    orderId: number,
    orderData: Partial<InsertOrder>,
    newReserved: boolean,
    currentOrder: Order
  ): Promise<Order | undefined> {
    try {
      apiLogger.info("Processing reservation change", {
        orderId,
        from: currentOrder.isReserved,
        to: newReserved,
      });

      if (newReserved && !currentOrder.isReserved) {
        // Добавляем резервы - создаем реальные записи в таблице reserves
        try {
          await transactionService.createReservesForOrder(orderId, currentOrder.warehouseId!);
          apiLogger.info("Order reserves created successfully", {
            orderId,
            warehouseId: currentOrder.warehouseId,
          });
        } catch (error) {
          apiLogger.error("Failed to create order reserves", {
            orderId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      } else if (!newReserved && currentOrder.isReserved) {
        // Удаляем резервы - используем прямой SQL запрос через transactionService
        try {
          await transactionService.removeReservesForOrder(orderId);
          apiLogger.info("Order reserves removed successfully", { orderId });
        } catch (error) {
          apiLogger.error("Failed to remove order reserves", {
            orderId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Обновляем заказ с новым статусом резервирования
      const updatedOrder = await storage.updateOrder(orderId, {
        ...orderData,
        isReserved: newReserved,
      });

      // Инвалидация кеша остатков
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Reservation status updated successfully", { orderId, newReserved });

      return updatedOrder;
    } catch (error) {
      apiLogger.error("Failed to update reservation status", {
        orderId,
        newReserved,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Приватный метод для транзакционного обновления заказа с позициями
  private async updateWithItems(
    orderId: number,
    orderData: Partial<InsertOrder>,
    items: CreateOrderItem[],
    isReserved: boolean
  ): Promise<Order | undefined> {
    try {
      // 1. Проверяем что заказ существует
      const currentOrder = await storage.getOrder(orderId);
      apiLogger.info("Current order retrieved", { orderId, found: !!currentOrder });
      if (!currentOrder) {
        apiLogger.warn("Order not found for update", { orderId });
        return undefined;
      }

      // 2. Обновляем основные данные заказа
      const updatedOrder = await storage.updateOrder(orderId, { ...orderData, isReserved });
      if (!updatedOrder) {
        return undefined;
      }

      // 3. Если изменился статус резервирования, обрабатываем резервы
      const currentReserved = currentOrder.isReserved || false;
      if (currentReserved !== isReserved) {
        if (isReserved && !currentReserved) {
          // Добавляем резервы для позиций
          for (const item of items) {
            await transactionService.createReserveForItem(
              orderId,
              item,
              updatedOrder.warehouseId || 33
            );
          }
          apiLogger.info("Reserves added for order items", { orderId, itemsCount: items.length });
        } else if (!isReserved && currentReserved) {
          // Удаляем существующие резервы
          await transactionService.removeReservesForOrder(orderId);
          apiLogger.info("Existing reserves removed", { orderId });
        }
      }

      // 4. Инвалидация кеша остатков
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Order updated with items", { orderId, isReserved, itemsCount: items.length });

      return updatedOrder;
    } catch (error) {
      apiLogger.error("Failed to update order with items", {
        orderId,
        isReserved,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const orderService = new OrderService();
