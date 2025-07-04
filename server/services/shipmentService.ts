import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { 
  shipments, 
  shipmentItems, 
  type Shipment, 
  type ShipmentItem
} from "@shared/schema";
import { logger, getErrorMessage } from "@shared/logger";
import { getMoscowTime } from "@shared/timeUtils";

export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

interface CreateShipmentData {
  orderId: number;
  date: string;
  status?: "draft" | "prepared" | "shipped" | "delivered" | "cancelled";
  warehouseId: number;
  responsibleUserId?: number;
  comments?: string;
}

export class ShipmentService {
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
          status?: "draft" | "prepared" | "shipped" | "delivered" | "cancelled";
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
    status: "draft" | "prepared" | "shipped" | "delivered" | "cancelled"
  ): Promise<ShipmentWithItems | undefined> {
    try {
      logger.info("Обновление статуса отгрузки", { orderId, shipmentId, status });

      const result = await db.transaction(async (tx) => {
        const [updatedShipment] = await tx
          .update(shipments)
          .set({
            status,
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
}