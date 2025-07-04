import { storage } from "../storage";
import { Shipment, InsertShipment } from "../../shared/schema";
import { logger } from "../../shared/logger";
import { BatchService } from "./batchService";

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