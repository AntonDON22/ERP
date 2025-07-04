import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { 
  shipments, 
  shipmentItems, 
  orders,
  orderItems,
  reserves,
  type Shipment, 
  type ShipmentItem
} from "@shared/schema";
import { logger, getErrorMessage } from "@shared/logger";
import { getMoscowTime } from "@shared/timeUtils";
import { transactionService } from "./transactionService";
import { storage } from "../storage";
import type { OrderWithItems } from "@shared/types";

export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

interface CreateShipmentData {
  orderId: number;
  date: string;
  status?: "draft" | "shipped";
  warehouseId: number;
  responsibleUserId?: number;
  comments?: string;
  items?: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
}

export class ShipmentService {
  /**
   * Получить все отгрузки
   */
  static async getAll(): Promise<ShipmentWithItems[]> {
    try {
      logger.info("Получение всех отгрузок", {});

      const shipmentsList = await db
        .select()
        .from(shipments);

      const shipmentsWithItems: ShipmentWithItems[] = [];
      
      for (const shipment of shipmentsList) {
        const items = await db
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipment.id));
        
        shipmentsWithItems.push({ ...shipment, items });
      }

      logger.info("Все отгрузки получены", { count: shipmentsWithItems.length });
      return shipmentsWithItems;
    } catch (error) {
      logger.error("Ошибка получения всех отгрузок", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Получить отгрузку по ID
   */
  static async getById(shipmentId: number): Promise<ShipmentWithItems | undefined> {
    try {
      logger.info("Получение отгрузки по ID", { shipmentId });

      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        return undefined;
      }

      const items = await db
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, shipmentId));

      logger.info("Отгрузка получена по ID", { shipmentId, itemsCount: items.length });
      return { ...shipment, items };
    } catch (error) {
      logger.error("Ошибка получения отгрузки по ID", { shipmentId, error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Создать отгрузку
   */
  static async create(shipmentData: CreateShipmentData): Promise<ShipmentWithItems> {
    try {
      const now = getMoscowTime();
      
      logger.info("Создание отгрузки", { shipmentData });

      const result = await db.transaction(async (tx) => {
        const insertData: {
          orderId: number;
          date: string;
          warehouseId: number;
          status?: "draft" | "shipped";
          responsibleUserId?: number | null;
          comments?: string | null;
        } = {
          orderId: shipmentData.orderId,
          date: shipmentData.date,
          warehouseId: shipmentData.warehouseId,
        };

        if (shipmentData.status) {
          insertData.status = shipmentData.status;
        }
        if (shipmentData.responsibleUserId) {
          insertData.responsibleUserId = shipmentData.responsibleUserId;
        }
        if (shipmentData.comments) {
          insertData.comments = shipmentData.comments;
        }

        const [newShipment] = await tx
          .insert(shipments)
          .values(insertData)
          .returning();

        // Сохранение позиций отгрузки
        const savedItems = [];
        if (shipmentData.items && shipmentData.items.length > 0) {
          for (const item of shipmentData.items) {
            const [savedItem] = await tx
              .insert(shipmentItems)
              .values({
                shipmentId: newShipment.id,
                productId: item.productId,
                quantity: String(item.quantity),
                price: String(item.price),
              })
              .returning();
            savedItems.push(savedItem);
          }
        }

        logger.info("Отгрузка создана", { shipmentId: newShipment.id, itemsCount: savedItems.length });

        return { ...newShipment, items: savedItems };
      });

      // КРИТИЧЕСКИ ВАЖНО: Снятие резерва заказа при создании отгрузки
      if (result) {
        await this.releaseOrderReserve(result.orderId);
        
        // КРИТИЧЕСКИ ВАЖНО: Автоматическое списание товаров при создании отгрузки
        await ShipmentService.autoWriteoffOnShipment(result.orderId);
      }

      return result;
    } catch (error) {
      logger.error("Ошибка создания отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Обновить отгрузку
   */
  static async update(shipmentId: number, shipmentData: Partial<CreateShipmentData>): Promise<ShipmentWithItems | undefined> {
    try {
      logger.info("Обновление отгрузки", { shipmentId, shipmentData });

      // Сначала получаем текущее состояние отгрузки
      const currentShipment = await this.getById(shipmentId);
      if (!currentShipment) {
        logger.warn("Отгрузка не найдена для обновления", { shipmentId });
        return undefined;
      }

      const result = await db.transaction(async (tx) => {
        const updateData: any = {
          updatedAt: getMoscowTime(),
        };

        if (shipmentData.date) updateData.date = shipmentData.date;
        if (shipmentData.status) updateData.status = shipmentData.status;
        if (shipmentData.warehouseId) updateData.warehouseId = shipmentData.warehouseId;
        if (shipmentData.responsibleUserId !== undefined) updateData.responsibleUserId = shipmentData.responsibleUserId;

        const [updatedShipment] = await tx
          .update(shipments)
          .set(updateData)
          .where(eq(shipments.id, shipmentId))
          .returning();

        if (!updatedShipment) {
          return undefined;
        }

        const items = await tx
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        logger.info("Отгрузка обновлена", { shipmentId });

        return { ...updatedShipment, items };
      });

      if (!result) {
        return result;
      }

      // КРИТИЧЕСКИ ВАЖНО: Снятие резерва заказа при создании отгрузки
      await this.releaseOrderReserve(result.orderId);

      // КРИТИЧЕСКИ ВАЖНО: Автоматическое списание товаров при смене статуса на "shipped"
      if (shipmentData.status === "shipped" && currentShipment.status !== "shipped") {
        logger.info("Статус отгрузки изменен на 'shipped' - запускаем автоматическое списание товаров", { 
          shipmentId, 
          oldStatus: currentShipment.status, 
          newStatus: "shipped" 
        });

        try {
          // Автоматически списываем товары через TransactionService
          await ShipmentService.autoWriteoffOnShipment(result.orderId);
          
          logger.info("Автоматическое списание товаров при отгрузке выполнено успешно", { 
            shipmentId, 
            orderId: result.orderId 
          });
        } catch (writeoffError) {
          logger.error("Ошибка при автоматическом списании товаров при отгрузке", { 
            shipmentId, 
            error: getErrorMessage(writeoffError) 
          });
          // Не прерываем выполнение, так как основное обновление отгрузки уже выполнено
        }
      }

      // КРИТИЧЕСКИ ВАЖНО: Отмена списания при переводе отгрузки обратно в черновик  
      if (shipmentData.status === "draft" && currentShipment.status === "shipped") {
        logger.info("Статус отгрузки изменен с 'shipped' на 'draft' - отменяем списание товаров", { 
          shipmentId, 
          oldStatus: currentShipment.status, 
          newStatus: "draft" 
        });

        try {
          // Создаем приходный документ для отмены списания
          await ShipmentService.cancelAutoWriteoff(result.orderId);
          
          logger.info("Отмена списания товаров при переводе в черновик выполнена успешно", { 
            shipmentId, 
            orderId: result.orderId 
          });
        } catch (cancelError) {
          logger.error("Ошибка при отмене списания товаров", { 
            shipmentId, 
            error: getErrorMessage(cancelError) 
          });
        }
      }

      return result;
    } catch (error) {
      logger.error("Ошибка обновления отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Удалить отгрузку
   */
  static async delete(shipmentId: number): Promise<boolean> {
    try {
      logger.info("Удаление отгрузки", { shipmentId });

      const result = await db.transaction(async (tx) => {
        // Получаем отгрузку перед удалением
        const [shipment] = await tx
          .select()
          .from(shipments)
          .where(eq(shipments.id, shipmentId));

        if (!shipment) {
          logger.warn("Отгрузка не найдена для удаления", { shipmentId });
          return false;
        }

        // Восстанавливаем резерв заказа
        await ShipmentService.restoreOrderReserve(shipment.orderId);

        // Отменяем автоматическое списание
        await ShipmentService.cancelAutoWriteoff(shipment.orderId);

        // Сначала удаляем позиции отгрузки
        await tx
          .delete(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        // Затем удаляем саму отгрузку
        const deletedRows = await tx
          .delete(shipments)
          .where(eq(shipments.id, shipmentId));

        return (deletedRows.rowCount ?? 0) > 0;
      });

      if (result) {
        logger.info("Отгрузка удалена", { shipmentId });
      } else {
        logger.warn("Отгрузка не найдена для удаления", { shipmentId });
      }

      return result;
    } catch (error) {
      logger.error("Ошибка удаления отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Множественное удаление отгрузок
   */
  static async deleteMultiple(ids: number[]): Promise<number> {
    try {
      logger.info("Множественное удаление отгрузок", { ids });

      let count = 0;
      for (const id of ids) {
        const success = await this.delete(id);
        if (success) count++;
      }

      logger.info("Множественное удаление отгрузок завершено", { count });
      return count;
    } catch (error) {
      logger.error("Ошибка множественного удаления отгрузок", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Получить все отгрузки для заказа
   */
  static async getShipmentsByOrderId(orderId: number): Promise<ShipmentWithItems[]> {
    try {
      logger.info("Получение отгрузок заказа", { orderId });

      const shipmentsList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.orderId, orderId));

      const shipmentsWithItems: ShipmentWithItems[] = [];
      
      for (const shipment of shipmentsList) {
        const items = await db
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipment.id));
        
        shipmentsWithItems.push({ ...shipment, items });
      }

      logger.info("Отгрузки заказа получены", { orderId, count: shipmentsWithItems.length });
      return shipmentsWithItems;
    } catch (error) {
      logger.error("Ошибка получения отгрузок заказа", { orderId, error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Получить отгрузку по ID
   */
  static async getShipmentById(orderId: number, shipmentId: number): Promise<ShipmentWithItems | undefined> {
    try {
      logger.info("Получение отгрузки", { orderId, shipmentId });

      const [shipment] = await db
        .select()
        .from(shipments)
        .where(and(
          eq(shipments.id, shipmentId),
          eq(shipments.orderId, orderId)
        ));

      if (!shipment) {
        return undefined;
      }

      const items = await db
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, shipmentId));

      logger.info("Отгрузка получена", { orderId, shipmentId, itemsCount: items.length });
      return { ...shipment, items };
    } catch (error) {
      logger.error("Ошибка получения отгрузки", { orderId, shipmentId, error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Создать отгрузку
   */
  static async createShipment(shipmentData: CreateShipmentData): Promise<ShipmentWithItems> {
    try {
      const now = getMoscowTime();
      
      logger.info("Создание отгрузки", { shipmentData });

      const result = await db.transaction(async (tx) => {
        // Создаем отгрузку с обязательными полями
        const insertData: {
          orderId: number;
          date: string;
          warehouseId: number;
          status?: "draft" | "shipped";
          responsibleUserId?: number | null;
          comments?: string | null;
        } = {
          orderId: shipmentData.orderId,
          date: shipmentData.date,
          warehouseId: shipmentData.warehouseId,
        };

        if (shipmentData.status) {
          insertData.status = shipmentData.status;
        }
        if (shipmentData.responsibleUserId) {
          insertData.responsibleUserId = shipmentData.responsibleUserId;
        }
        if (shipmentData.comments) {
          insertData.comments = shipmentData.comments;
        }

        const [newShipment] = await tx
          .insert(shipments)
          .values(insertData)
          .returning();

        logger.info("Отгрузка создана", { shipmentId: newShipment.id });

        return { ...newShipment, items: [] };
      });

      return result;
    } catch (error) {
      logger.error("Ошибка создания отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Обновить статус отгрузки
   */
  static async updateShipmentStatus(
    orderId: number,
    shipmentId: number,
    status: "draft" | "shipped"
  ): Promise<ShipmentWithItems | undefined> {
    try {
      logger.info("Обновление статуса отгрузки", { orderId, shipmentId, status });

      const result = await db.transaction(async (tx) => {
        const [updatedShipment] = await tx
          .update(shipments)
          .set({
            status: status as "draft" | "shipped",
            updatedAt: getMoscowTime(),
          })
          .where(and(
            eq(shipments.id, shipmentId),
            eq(shipments.orderId, orderId)
          ))
          .returning();

        if (!updatedShipment) {
          return undefined;
        }

        const items = await tx
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        logger.info("Статус отгрузки обновлен", { shipmentId, status });

        return { ...updatedShipment, items };
      });

      return result;
    } catch (error) {
      logger.error("Ошибка обновления статуса отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Удалить отгрузку
   */
  static async deleteShipment(orderId: number, shipmentId: number): Promise<boolean> {
    try {
      logger.info("Удаление отгрузки", { orderId, shipmentId });

      const result = await db.transaction(async (tx) => {
        // Сначала удаляем позиции отгрузки
        await tx
          .delete(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        // Затем удаляем саму отгрузку
        const deletedRows = await tx
          .delete(shipments)
          .where(and(
            eq(shipments.id, shipmentId),
            eq(shipments.orderId, orderId)
          ));

        return (deletedRows.rowCount ?? 0) > 0;
      });

      if (result) {
        logger.info("Отгрузка удалена", { shipmentId });
      } else {
        logger.warn("Отгрузка не найдена для удаления", { shipmentId });
      }

      return result;
    } catch (error) {
      logger.error("Ошибка удаления отгрузки", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Снятие резерва заказа при создании отгрузки
   */
  private static async releaseOrderReserve(orderId: number): Promise<void> {
    try {
      logger.info("Снятие резерва заказа при создании отгрузки", { orderId });

      // Снимаем резерв с заказа и удаляем резервы используя TransactionService
      await transactionService.clearOrderReserves(orderId);

      logger.info("Резерв заказа снят успешно", { orderId });

    } catch (error) {
      logger.error("Ошибка снятия резерва заказа", { 
        orderId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  /**
   * Автоматическое списание товаров при создании отгрузки
   * Создает документ списания на основе позиций заказа
   */
  private static async autoWriteoffOnShipment(orderId: number): Promise<void> {
    try {
      logger.info("Автоматическое списание товаров при создании отгрузки", { orderId });

      // Получаем данные заказа напрямую из БД
      const orderResult = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!orderResult[0]) {
        logger.warn("Заказ не найден для списания", { orderId });
        return;
      }

      // Получаем позиции заказа
      const itemsResult = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (itemsResult.length === 0) {
        logger.warn("Заказ не содержит товаров для списания", { orderId });
        return;
      }

      const order = orderResult[0];

      // Создаем документ списания через TransactionService
      await transactionService.createDocumentWithInventory(
        {
          name: `Списание по отгрузке заказа ${orderId}`,
          type: "outcome",
          status: "posted",
          warehouseId: order.warehouseId || 117, // используем склад заказа
        },
        itemsResult.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        }))
      );

      logger.info("Автоматическое списание товаров выполнено успешно", { orderId });

    } catch (error) {
      logger.error("Ошибка автоматического списания товаров", { 
        orderId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  /**
   * Восстановление резерва заказа при удалении отгрузки
   */
  private static async restoreOrderReserve(orderId: number): Promise<void> {
    try {
      logger.info("Восстановление резерва заказа при удалении отгрузки", { orderId });

      // Получаем информацию о заказе для склада
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        logger.warn("Заказ не найден для восстановления резерва", { orderId });
        return;
      }

      // Устанавливаем isReserved = true для заказа
      await db
        .update(orders)
        .set({ 
          isReserved: true,
          updatedAt: getMoscowTime()
        })
        .where(eq(orders.id, orderId));

      // Восстанавливаем резервы через TransactionService
      await transactionService.createReservesForOrder(orderId, order.warehouseId || 117);

      logger.info("Резерв заказа восстановлен при удалении отгрузки", { orderId });
    } catch (error) {
      logger.error("Ошибка восстановления резерва заказа", { 
        orderId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  /**
   * Отмена автоматического списания при удалении отгрузки
   */
  private static async cancelAutoWriteoff(orderId: number): Promise<void> {
    try {
      logger.info("Отмена автоматического списания при удалении отгрузки", { orderId });

      // Получаем позиции заказа для восстановления остатков
      const itemsResult = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (itemsResult.length === 0) {
        logger.warn("Позиции заказа не найдены для отмены списания", { orderId });
        return;
      }

      // Получаем информацию о заказе для склада
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        logger.warn("Заказ не найден для отмены списания", { orderId });
        return;
      }

      // Создаем документ оприходования для отмены списания
      const documentData = {
        name: `Восстановление товаров заказа ${orderId}`,
        type: "income" as const,
        status: "posted" as const,
        warehouseId: order.warehouseId || 117,
      };

      const items = itemsResult.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

      // Создаем приходный документ для восстановления остатков
      await transactionService.createDocumentWithInventory(documentData, items);

      logger.info("Автоматическое списание отменено успешно", { orderId });
    } catch (error) {
      logger.error("Ошибка отмены автоматического списания", { 
        orderId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }
}