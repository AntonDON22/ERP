import { storage } from "../storage";
import { Shipment, InsertShipment, orderItems } from "../../shared/schema";
import { logger } from "../../shared/logger";
import { BatchService } from "./batchService";
import { cacheService } from "./cacheService";
import { db } from "../db";
import { eq } from "drizzle-orm";

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * Сервис для работы с отгрузками
 * Статический класс для унификации архитектуры
 */
export class ShipmentService {
  /**
   * Получить все отгрузки
   */
  static async getAll(): Promise<Shipment[]> {
    try {
      const shipments = await storage.getShipments();
      return shipments;
    } catch (error) {
      logger.error("Error in ShipmentService.getAll", { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Получить отгрузку по ID
   */
  static async getById(id: number): Promise<Shipment | undefined> {
    try {
      // Проверяем валидность ID
      if (!id || id <= 0) {
        throw new Error("Некорректный ID отгрузки");
      }

      const shipment = await storage.getShipment(id);
      return shipment;
    } catch (error) {
      logger.error("Error in ShipmentService.getById", { 
        error: getErrorMessage(error), 
        shipmentId: id 
      });
      throw error;
    }
  }

  /**
   * Создать новую отгрузку
   */
  static async create(data: InsertShipment): Promise<Shipment> {
    try {
      // Проверяем обязательные поля
      if (!data.orderId || !data.warehouseId) {
        throw new Error("Заказ и склад являются обязательными полями");
      }

      const shipment = await storage.createShipment(data);
      
      logger.info("Shipment created via service", { 
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        status: shipment.status 
      });
      
      return shipment;
    } catch (error) {
      logger.error("Error in ShipmentService.create", { 
        error: getErrorMessage(error), 
        data 
      });
      throw error;
    }
  }

  /**
   * Обновить отгрузку
   */
  static async update(id: number, data: Partial<InsertShipment>): Promise<Shipment | undefined> {
    try {
      // Проверяем существование отгрузки
      const existingShipment = await storage.getShipment(id);
      if (!existingShipment) {
        logger.warn("Attempt to update non-existent shipment", { shipmentId: id });
        return undefined;
      }

      const updatedShipment = await storage.updateShipment(id, data);
      
      if (updatedShipment) {
        logger.info("Shipment updated via service", { 
          shipmentId: id,
          updatedFields: Object.keys(data),
          status: updatedShipment.status 
        });
        
        // Обрабатываем изменение статуса отгрузки
        if (data.status && data.status !== existingShipment.status) {
          const oldStatus = existingShipment.status;
          const newStatus = data.status;
          
          // При переходе в статус "shipped" - списываем товары
          if (newStatus === "shipped" && oldStatus === "draft") {
            logger.info("Processing writeoff for shipment going to shipped status", { 
              shipmentId: id, 
              oldStatus, 
              newStatus 
            });
            
            // Загружаем позиции отгрузки из связанного заказа для списания
            const shipmentItems = await ShipmentService.getShipmentItems(updatedShipment.orderId);
            if (shipmentItems.length > 0) {
              await storage.processShipmentWriteoff(id, shipmentItems);
            }
          }
          
          // При переходе из статуса "shipped" в "draft" - восстанавливаем товары
          if (newStatus === "draft" && oldStatus === "shipped") {
            logger.info("Processing restore for shipment going from shipped to draft", { 
              shipmentId: id, 
              oldStatus, 
              newStatus 
            });
            
            // Загружаем позиции отгрузки из связанного заказа для восстановления
            const shipmentItems = await ShipmentService.getShipmentItems(updatedShipment.orderId);
            if (shipmentItems.length > 0) {
              await storage.processShipmentRestore(id, shipmentItems);
            }
          }
          
          // Инвалидируем кеш остатков после изменения статуса
          await cacheService.invalidatePattern("inventory:");
          logger.info("Inventory cache invalidated after shipment status change", { 
            shipmentId: id, 
            oldStatus,
            newStatus: updatedShipment.status 
          });
        }
      }
      
      return updatedShipment;
    } catch (error) {
      logger.error("Error in ShipmentService.update", { 
        error: getErrorMessage(error), 
        shipmentId: id, 
        data 
      });
      throw error;
    }
  }

  /**
   * Получить позиции отгрузки из связанного заказа
   */
  private static async getShipmentItems(orderId: number): Promise<any[]> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        logger.warn("Order not found for shipment", { orderId });
        return [];
      }

      // Загружаем позиции заказа как позиции отгрузки
      const orderItemsData = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      
      return orderItemsData.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price)
      }));
    } catch (error) {
      logger.error("Error getting shipment items", { 
        error: getErrorMessage(error), 
        orderId 
      });
      return [];
    }
  }

  /**
   * Удалить отгрузку
   */
  static async delete(id: number): Promise<boolean> {
    try {
      // Проверяем существование отгрузки
      const existingShipment = await storage.getShipment(id);
      if (!existingShipment) {
        logger.warn("Attempt to delete non-existent shipment", { shipmentId: id });
        return false;
      }

      const deleted = await storage.deleteShipment(id);
      
      if (deleted) {
        logger.info("Shipment deleted via service", { shipmentId: id });
      }
      
      return deleted;
    } catch (error) {
      logger.error("Error in ShipmentService.delete", { 
        error: getErrorMessage(error), 
        shipmentId: id 
      });
      throw error;
    }
  }

  /**
   * Множественное удаление отгрузок
   */
  static async deleteMultiple(ids: number[]): Promise<boolean> {
    try {
      if (!ids || ids.length === 0) {
        throw new Error("Список ID отгрузок не может быть пустым");
      }

      const deletedCount = await BatchService.deleteShipments(ids);
      
      logger.info("Multiple shipments deleted via service", { 
        requestedCount: ids.length,
        deletedCount 
      });
      
      return deletedCount > 0;
    } catch (error) {
      logger.error("Error in ShipmentService.deleteMultiple", { 
        error: getErrorMessage(error), 
        shipmentIds: ids 
      });
      throw error;
    }
  }
}