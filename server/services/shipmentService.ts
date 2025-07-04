import { 
  shipments, 
  shipmentItems, 
  type Shipment, 
  type ShipmentItem, 
  type InsertShipment, 
  type CreateShipmentItem,
  orders,
  inventory
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@shared/logger";
import { getMoscowTime } from "@shared/timeUtils";

export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

export class ShipmentService {
  /**
   * Получить все отгрузки для заказа
   */
  static async getShipmentsByOrderId(orderId: number): Promise<ShipmentWithItems[]> {
    try {
      logger.debug("Получение отгрузок для заказа", { orderId });

      // Получаем отгрузки
      const shipmentsList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.orderId, orderId))
        .orderBy(sql`${shipments.createdAt} DESC`);

      // Для каждой отгрузки получаем позиции
      const shipmentsWithItems: ShipmentWithItems[] = [];
      
      for (const shipment of shipmentsList) {
        const items = await db
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipment.id));

        shipmentsWithItems.push({
          ...shipment,
          items
        });
      }

      logger.info("Отгрузки получены", { orderId, count: shipmentsWithItems.length });
      return shipmentsWithItems;
    } catch (error) {
      logger.error("Ошибка получения отгрузок", { orderId, error: String(error) });
      throw error;
    }
  }

  /**
   * Получить отгрузку по ID
   */
  static async getShipmentById(orderId: number, shipmentId: number): Promise<ShipmentWithItems | undefined> {
    try {
      logger.debug("Получение отгрузки по ID", { orderId, shipmentId });

      // Получаем отгрузку
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(and(
          eq(shipments.id, shipmentId),
          eq(shipments.orderId, orderId)
        ));

      if (!shipment) {
        logger.warn("Отгрузка не найдена", { orderId, shipmentId });
        return undefined;
      }

      // Получаем позиции отгрузки
      const items = await db
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, shipmentId));

      logger.info("Отгрузка получена", { orderId, shipmentId, itemsCount: items.length });
      return { ...shipment, items };
    } catch (error) {
      logger.error("Ошибка получения отгрузки", { orderId, shipmentId, error: error.message });
      throw error;
    }
  }

  /**
   * Создать отгрузку с FIFO списанием
   */
  static async createShipment(shipmentData: InsertShipment): Promise<ShipmentWithItems> {
    return await db.transaction(async (tx) => {
      try {
        logger.info("Создание отгрузки", { orderId: shipmentData.orderId });

        // Проверяем существование заказа
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, shipmentData.orderId));

        if (!order) {
          throw new Error(`Заказ с ID ${shipmentData.orderId} не найден`);
        }

        // Проверяем, что заказ зарезервирован
        if (!order.isReserved) {
          throw new Error("Создание отгрузки возможно только для заказов с резервированием товаров");
        }

        const now = getMoscowTime();

        // Создаем отгрузку
        const [newShipment] = await tx
          .insert(shipments)
          .values({
            orderId: shipmentData.orderId,
            date: shipmentData.date,
            status: shipmentData.status || "draft",
            warehouseId: shipmentData.warehouseId,
            responsibleUserId: shipmentData.responsibleUserId || null,
            comments: shipmentData.comments || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // Создаем позиции отгрузки
        const createdItems: ShipmentItem[] = [];
        
        for (const item of shipmentData.items) {
          const [newItem] = await tx
            .insert(shipmentItems)
            .values({
              shipmentId: newShipment.id,
              productId: item.productId,
              quantity: item.quantity.toString(),
              price: item.price.toString(),
            })
            .returning();

          createdItems.push(newItem);

          // FIFO списание только для проведенных отгрузок
          if (newShipment.status === "shipped" || newShipment.status === "delivered") {
            // Простое списание - добавляем запись в inventory с отрицательным количеством
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                warehouseId: shipmentData.warehouseId,
                quantity: `-${item.quantity}`, // Отрицательное количество для списания
                reservedQuantity: "0",
                timestamp: now,
                movementType: "outcome",
                documentId: newShipment.id,
              });
          }
        }

        logger.info("Отгрузка создана", { 
          shipmentId: newShipment.id, 
          orderId: shipmentData.orderId,
          itemsCount: createdItems.length 
        });

        return { ...newShipment, items: createdItems };
      } catch (error) {
        logger.error("Ошибка создания отгрузки", { 
          orderId: shipmentData.orderId, 
          error: String(error) 
        });
        throw error;
      }
    });
  }

  /**
   * Обновить статус отгрузки с обработкой FIFO
   */
  static async updateShipmentStatus(
    orderId: number, 
    shipmentId: number, 
    newStatus: string
  ): Promise<ShipmentWithItems | undefined> {
    return await db.transaction(async (tx) => {
      try {
        logger.info("Обновление статуса отгрузки", { orderId, shipmentId, newStatus });

        // Получаем текущую отгрузку
        const [currentShipment] = await tx
          .select()
          .from(shipments)
          .where(and(
            eq(shipments.id, shipmentId),
            eq(shipments.orderId, orderId)
          ));

        if (!currentShipment) {
          logger.warn("Отгрузка не найдена для обновления", { orderId, shipmentId });
          return undefined;
        }

        const oldStatus = currentShipment.status;
        const now = getMoscowTime();

        // Обновляем статус
        const [updatedShipment] = await tx
          .update(shipments)
          .set({ 
            status: newStatus as any,
            updatedAt: now 
          })
          .where(eq(shipments.id, shipmentId))
          .returning();

        // Получаем позиции отгрузки
        const items = await tx
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        // Обрабатываем изменение статуса для списания
        const shouldProcessWriteoff = (newStatus === "shipped" || newStatus === "delivered") && 
                                     (oldStatus !== "shipped" && oldStatus !== "delivered");
        
        const shouldRevertWriteoff = (oldStatus === "shipped" || oldStatus === "delivered") && 
                                    (newStatus !== "shipped" && newStatus !== "delivered");

        if (shouldProcessWriteoff) {
          // Списываем товары при отгрузке
          for (const item of items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                warehouseId: updatedShipment.warehouseId,
                quantity: `-${item.quantity}`, // Отрицательное количество для списания
                reservedQuantity: "0",
                timestamp: now,
              });
          }
          logger.info("Списание выполнено", { shipmentId, itemsCount: items.length });
        } else if (shouldRevertWriteoff) {
          // Возвращаем товары при отмене отгрузки
          for (const item of items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                warehouseId: updatedShipment.warehouseId,
                quantity: item.quantity,
                reservedQuantity: "0",
                timestamp: now,
              });
          }
          logger.info("Возврат товаров выполнен", { shipmentId, itemsCount: items.length });
        }

        logger.info("Статус отгрузки обновлен", { 
          shipmentId, 
          oldStatus, 
          newStatus,
          writeoffProcessed: shouldProcessWriteoff,
          writeoffReverted: shouldRevertWriteoff
        });

        return { ...updatedShipment, items };
      } catch (error) {
        logger.error("Ошибка обновления статуса отгрузки", { 
          orderId, 
          shipmentId, 
          newStatus, 
          error: String(error) 
        });
        throw error;
      }
    });
  }

  /**
   * Удалить отгрузку
   */
  static async deleteShipment(orderId: number, shipmentId: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      try {
        logger.info("Удаление отгрузки", { orderId, shipmentId });

        // Получаем отгрузку для проверки статуса
        const [shipment] = await tx
          .select()
          .from(shipments)
          .where(and(
            eq(shipments.id, shipmentId),
            eq(shipments.orderId, orderId)
          ));

        if (!shipment) {
          logger.warn("Отгрузка не найдена для удаления", { orderId, shipmentId });
          return false;
        }

        // Если отгрузка была проведена, возвращаем товары
        if (shipment.status === "shipped" || shipment.status === "delivered") {
          const items = await tx
            .select()
            .from(shipmentItems)
            .where(eq(shipmentItems.shipmentId, shipmentId));

          const now = getMoscowTime();
          
          for (const item of items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                warehouseId: shipment.warehouseId,
                quantity: item.quantity,
                reservedQuantity: "0",
                timestamp: now,
              });
          }
          
          logger.info("Товары возвращены при удалении отгрузки", { 
            shipmentId, 
            itemsCount: items.length 
          });
        }

        // Удаляем позиции отгрузки
        await tx
          .delete(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipmentId));

        // Удаляем отгрузку
        await tx
          .delete(shipments)
          .where(eq(shipments.id, shipmentId));

        logger.info("Отгрузка удалена", { orderId, shipmentId });
        return true;
      } catch (error) {
        logger.error("Ошибка удаления отгрузки", { 
          orderId, 
          shipmentId, 
          error: String(error) 
        });
        throw error;
      }
    });
  }
}