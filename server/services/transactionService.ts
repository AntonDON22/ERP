import { db } from "../db";
import {
  documents,
  documentItems,
  inventory,
  reserves,
  orders,
  orderItems as orderItemsTable,
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import type { InsertDocument, CreateDocumentItem } from "../../shared/schema";
import { getMoscowTime } from "../../shared/timeUtils";
import { cacheService } from "./cacheService";
import { apiLogger } from "../../shared/logger";

export class TransactionService {
  // Транзакционное создание документа с пересчетом остатков
  async createDocumentWithInventory(document: InsertDocument, items: CreateDocumentItem[]) {
    return await db.transaction(async (tx) => {
      console.log("🔄 Начинаем транзакцию создания документа");

      // 1. Создаем документ
      const [createdDocument] = await tx.insert(documents).values(document).returning();

      // 2. Генерируем автоматическое название
      const today = new Date().toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayDocuments = await tx
        .select()
        .from(documents)
        .where(
          sql`${documents.type} = ${createdDocument.type} AND ${documents.createdAt} >= ${todayStart.toISOString()} AND ${documents.createdAt} <= ${todayEnd.toISOString()}`
        );

      const dayNumber = todayDocuments.length;
      const name = `${createdDocument.type} ${today}-${dayNumber}`;

      const [updatedDocument] = await tx
        .update(documents)
        .set({ name })
        .where(eq(documents.id, createdDocument.id))
        .returning();

      // 3. Создаем позиции документа
      for (const item of items) {
        await tx.insert(documentItems).values({
          productId: item.productId,
          quantity: item.quantity.toString(),
          price: item.price ?? "0",
          documentId: createdDocument.id,
        });

        // 4. Обрабатываем движения инвентаря транзакционно
        await this.processInventoryMovement(tx, {
          productId: item.productId,
          quantity: item.quantity.toString(),
          price: item.price ?? "0",
          documentId: createdDocument.id,
          movementType: updatedDocument.type === "income" ? "IN" : "OUT",
          warehouseId: updatedDocument.warehouseId || undefined,
        });
      }

      console.log("✅ Транзакция создания документа завершена");

      // Инвалидация кеша остатков после создания документа
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Inventory cache invalidated after document creation", {
        documentId: updatedDocument.id,
      });

      return updatedDocument;
    });
  }

  // Транзакционное обновление документа с пересчетом остатков
  async updateDocumentWithInventory(
    documentId: number,
    updatedDocument: Partial<InsertDocument>,
    newItems?: CreateDocumentItem[]
  ) {
    return await db.transaction(async (tx) => {
      console.log(`🔄 Начинаем транзакцию обновления документа ${documentId}`);

      // 1. Получаем текущий документ
      const [currentDocument] = await tx
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      if (!currentDocument) {
        throw new Error(`Документ с ID ${documentId} не найден`);
      }

      // 2. Удаляем старые движения по складу для этого документа
      await tx.delete(inventory).where(eq(inventory.documentId, documentId));

      // 3. Удаляем старые позиции документа
      await tx.delete(documentItems).where(eq(documentItems.documentId, documentId));

      // 4. Обновляем документ с автоматическим временем обновления
      const documentUpdateData = {
        ...updatedDocument,
        updatedAt: getMoscowTime(),
      };
      console.log('🔧 TransactionService - documentUpdateData:', documentUpdateData);
      
      const [document] = await tx
        .update(documents)
        .set(documentUpdateData)
        .where(eq(documents.id, documentId))
        .returning();

      // 5. Если есть новые позиции, создаем их
      if (newItems && newItems.length > 0) {
        for (const item of newItems) {
          await tx.insert(documentItems).values({
            productId: item.productId,
            quantity: item.quantity.toString(),
            price: "0", // Цена по умолчанию для позиций без цены
            documentId: documentId,
          });

          // 6. Создаем новые движения по складу
          await this.processInventoryMovement(tx, {
            productId: item.productId,
            quantity: item.quantity.toString(),
            price: "0", // Цена по умолчанию для движений без цены
            documentId: documentId,
            movementType: document.type === "income" ? "IN" : "OUT",
            warehouseId: document.warehouseId || undefined,
          });
        }
      }

      console.log("✅ Транзакция обновления документа завершена");

      // Инвалидация кеша остатков после обновления документа
      await cacheService.invalidatePattern("inventory:*");
      apiLogger.info("Inventory cache invalidated after document update", { documentId });

      return document;
    });
  }

  // Транзакционное удаление документа с очисткой остатков
  async deleteDocumentWithInventory(documentId: number) {
    return await db.transaction(async (tx) => {
      console.log(`🔄 Начинаем транзакцию удаления документа ${documentId}`);

      // 1. Удаляем связанные записи из inventory
      const inventoryResult = await tx
        .delete(inventory)
        .where(eq(inventory.documentId, documentId));
      console.log(`🗑️ Удалено ${inventoryResult.rowCount ?? 0} записей inventory`);

      // 2. Удаляем связанные записи из document_items
      const itemsResult = await tx
        .delete(documentItems)
        .where(eq(documentItems.documentId, documentId));
      console.log(`🗑️ Удалено ${itemsResult.rowCount ?? 0} позиций документа`);

      // 3. Удаляем сам документ
      const documentResult = await tx.delete(documents).where(eq(documents.id, documentId));

      const success = (documentResult.rowCount ?? 0) > 0;
      console.log("✅ Транзакция удаления документа завершена");

      // Инвалидация кеша остатков после успешного удаления
      if (success) {
        await cacheService.invalidatePattern("inventory:*");
        apiLogger.info("Inventory cache invalidated after document deletion", { documentId });
      }

      return success;
    });
  }

  // Транзакционная обработка заказов с резервами
  async processOrderWithReserves(orderData: any, items: any[], isReserved: boolean) {
    return await db.transaction(async (tx) => {
      console.log("🔄 Начинаем транзакцию создания заказа с резервами");

      // 1. Создаем заказ
      const [createdOrder] = await tx.insert(orders).values(orderData).returning();

      let totalAmount = 0;

      // 2. Создаем позиции заказа
      for (const item of items) {
        await tx.insert(orderItemsTable).values({
          ...item,
          orderId: createdOrder.id,
        });

        totalAmount += parseFloat(item.quantity) * parseFloat(item.price);

        // 3. Если заказ резервируется, создаем резервы
        if (isReserved) {
          await tx.insert(reserves).values({
            orderId: createdOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            warehouseId: orderData.warehouseId,
            createdAt: getMoscowTime(),
          });
          console.log(`📦 Создан резерв для заказа ${createdOrder.id}, товар ${item.productId}`);
        }
      }

      // 4. Обновляем заказ с итоговой суммой и названием
      const today = new Date().toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });

      const todayOrders = await tx
        .select()
        .from(orders)
        .where(sql`DATE(${orders.createdAt}) = CURRENT_DATE`);

      const dayNumber = todayOrders.length;
      const name = `Заказ ${today}-${dayNumber}`;

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          name,
          totalAmount: totalAmount.toFixed(2),
          isReserved: isReserved,
        })
        .where(eq(orders.id, createdOrder.id))
        .returning();

      console.log("✅ Транзакция создания заказа завершена");

      // Инвалидация кеша остатков если создавались резервы
      if (isReserved) {
        await cacheService.invalidatePattern("inventory:*");
        apiLogger.info("Inventory cache invalidated after order creation with reserves", {
          orderId: updatedOrder.id,
        });
      }

      return updatedOrder;
    });
  }

  // Универсальная обработка движений инвентаря (внутри транзакции)
  private async processInventoryMovement(
    tx: any,
    movement: {
      productId: number;
      quantity: string;
      price: string;
      documentId: number;
      movementType: "IN" | "OUT";
      warehouseId?: number;
    }
  ) {
    if (movement.movementType === "IN") {
      // Приход - просто добавляем запись
      await tx.insert(inventory).values({
        productId: movement.productId,
        quantity: movement.quantity,
        price: movement.price,
        movementType: "IN",
        documentId: movement.documentId,
        createdAt: getMoscowTime(),
      });
    } else {
      // Расход - используем FIFO логику
      await this.processWriteoffFIFO(
        tx,
        movement.productId,
        Number(movement.quantity),
        movement.price,
        movement.documentId
      );
    }
  }

  // FIFO логика списания (адаптированная для работы внутри транзакции)
  private async processWriteoffFIFO(
    tx: any,
    productId: number,
    quantityToWriteoff: number,
    writeoffPrice: string,
    documentId: number
  ) {
    console.log(`🔄 FIFO-списание для товара ${productId}, количество: ${quantityToWriteoff}`);

    // Получаем все приходы товара, отсортированные по дате создания (FIFO)
    const stockMovements = await tx
      .select()
      .from(inventory)
      .where(
        sql`${inventory.productId} = ${productId} AND CAST(${inventory.quantity} AS DECIMAL) > 0`
      )
      .orderBy(sql`${inventory.createdAt} ASC`);

    console.log(`📋 Найдено ${stockMovements.length} приходных движений для товара ${productId}`);

    let remainingToWriteoff = quantityToWriteoff;
    const writeoffEntries = [];

    // Проходим по всем приходам и списываем FIFO
    for (const stockItem of stockMovements) {
      if (remainingToWriteoff <= 0) break;

      const availableQuantity = Number(stockItem.quantity);
      const quantityToTakeFromThisBatch = Math.min(remainingToWriteoff, availableQuantity);

      if (quantityToTakeFromThisBatch > 0) {
        writeoffEntries.push({
          productId: productId,
          quantity: `-${quantityToTakeFromThisBatch}`,
          price: stockItem.price,
          movementType: "OUT" as const,
          documentId: documentId,
          createdAt: getMoscowTime(),
        });

        remainingToWriteoff -= quantityToTakeFromThisBatch;
        console.log(`📤 Списано ${quantityToTakeFromThisBatch} из партии ${stockItem.id}`);
      }
    }

    // Выполняем batch insert для всех списаний
    if (writeoffEntries.length > 0) {
      await tx.insert(inventory).values(writeoffEntries);
    }

    // Если остались несписанные товары - создаем запись о списании в минус
    if (remainingToWriteoff > 0) {
      console.log(`⚠️ Списание в минус: ${remainingToWriteoff} единиц`);

      await tx.insert(inventory).values({
        productId: productId,
        quantity: `-${remainingToWriteoff}`,
        price: writeoffPrice,
        movementType: "OUT",
        documentId: documentId,
        createdAt: getMoscowTime(),
      });
    }

    console.log("✅ FIFO-списание завершено");
  }

  // Метод для удаления резервов заказа
  async removeReservesForOrder(orderId: number): Promise<void> {
    await db.delete(reserves).where(eq(reserves.orderId, orderId));
    apiLogger.info("Reserves removed for order", { orderId });
  }

  // Метод для создания резервов для всех позиций заказа
  async createReservesForOrder(orderId: number, warehouseId: number): Promise<void> {
    try {
      // Получаем все позиции заказа
      const orderItemsList = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

      if (orderItemsList.length === 0) {
        apiLogger.warn("No order items found for creating reserves", { orderId });
        return;
      }

      // Создаем резервы для каждой позиции
      for (const orderItem of orderItemsList) {
        await db.insert(reserves).values({
          orderId,
          productId: orderItem.productId,
          warehouseId,
          quantity: orderItem.quantity,
          createdAt: getMoscowTime(),
        });
      }

      apiLogger.info("Reserves created for all order items", {
        orderId,
        warehouseId,
        itemsCount: orderItemsList.length,
      });
    } catch (error) {
      apiLogger.error("Failed to create reserves for order", {
        orderId,
        warehouseId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Метод для создания резерва для отдельной позиции заказа
  async createReserveForItem(orderId: number, item: any, warehouseId: number): Promise<void> {
    await db.insert(reserves).values({
      orderId,
      productId: item.productId,
      warehouseId,
      quantity: item.quantity,
      createdAt: getMoscowTime(),
    });
    apiLogger.info("Reserve created for order item", {
      orderId,
      productId: item.productId,
      quantity: item.quantity,
    });
  }
}

export const transactionService = new TransactionService();
