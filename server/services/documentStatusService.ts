import { db } from "../db";
import { documents, inventory, documentItems, type DocumentRecord } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getMoscowTime } from "@shared/timeUtils";
import { inventoryLogger, getErrorMessage } from "@shared/logger";

export class DocumentStatusService {
  /**
   * Проводит документ - меняет статус на "posted" и создает записи в inventory
   */
  async postDocument(documentId: number): Promise<DocumentRecord | undefined> {
    const endOperation = inventoryLogger.startOperation('postDocument');
    
    try {
      inventoryLogger.info('Starting document posting', { documentId });
      
      return await db.transaction(async (tx) => {
        // Получаем документ
        const [document] = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, documentId));
        
        if (!document) {
          inventoryLogger.warn('Document not found for posting', { documentId });
          return undefined;
        }
        
        if (document.status === 'posted') {
          inventoryLogger.info('Document already posted', { documentId });
          return document;
        }
        
        // Получаем позиции документа
        const items = await tx
          .select()
          .from(documentItems)
          .where(eq(documentItems.documentId, documentId));
        
        if (items.length === 0) {
          inventoryLogger.warn('No items found for document', { documentId });
          return undefined;
        }
        
        // Создаем записи в inventory для каждой позиции
        const now = getMoscowTime();
        for (const item of items) {
          const quantity = document.type === 'Оприходование' ? parseFloat(item.quantity) : -parseFloat(item.quantity);
          const movementType = document.type === 'Оприходование' ? 'IN' : 'OUT';
          
          await tx.insert(inventory).values({
            productId: item.productId,
            documentId: documentId,
            quantity: quantity.toString(),
            price: item.price,
            movementType: movementType,
            createdAt: now
          });
        }
        
        // Обновляем статус документа
        const [updatedDocument] = await tx
          .update(documents)
          .set({ 
            status: 'posted',
            postedAt: now
          })
          .where(eq(documents.id, documentId))
          .returning();
        
        inventoryLogger.info('Document posted successfully with inventory records', { 
          documentId, 
          itemsCount: items.length 
        });
        return updatedDocument;
      });
    } catch (error) {
      inventoryLogger.error('Error posting document', { error: getErrorMessage(error), documentId });
      throw error;
    } finally {
      endOperation();
    }
  }

  /**
   * Отменяет проведение документа - меняет статус на "draft" и удаляет записи из inventory
   */
  async unpostDocument(documentId: number): Promise<DocumentRecord | undefined> {
    const endOperation = inventoryLogger.startOperation('unpostDocument');
    
    try {
      inventoryLogger.info('Starting document unposting', { documentId });
      
      return await db.transaction(async (tx) => {
        // Получаем документ
        const [document] = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, documentId));
        
        if (!document) {
          inventoryLogger.warn('Document not found for unposting', { documentId });
          return undefined;
        }
        
        if (document.status === 'draft') {
          inventoryLogger.info('Document already in draft status', { documentId });
          return document;
        }
        
        // Удаляем записи из inventory связанные с этим документом
        const deletedInventory = await tx
          .delete(inventory)
          .where(eq(inventory.documentId, documentId))
          .returning();
        
        // Обновляем статус документа
        const [updatedDocument] = await tx
          .update(documents)
          .set({ 
            status: 'draft',
            postedAt: null
          })
          .where(eq(documents.id, documentId))
          .returning();
        
        inventoryLogger.info('Document unposted successfully with inventory cleanup', { 
          documentId, 
          removedInventoryRecords: deletedInventory.length 
        });
        return updatedDocument;
      });
    } catch (error) {
      inventoryLogger.error('Error unposting document', { error: getErrorMessage(error), documentId });
      throw error;
    } finally {
      endOperation();
    }
  }

  /**
   * Переключает статус документа между draft и posted
   */
  async toggleDocumentStatus(documentId: number): Promise<DocumentRecord | undefined> {
    const endOperation = inventoryLogger.startOperation('toggleDocumentStatus');
    
    try {
      inventoryLogger.info('Starting document status toggle', { documentId });
      
      // Получаем текущий статус документа
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      if (!document) {
        inventoryLogger.warn('Document not found for status toggle', { documentId });
        return undefined;
      }
      
      // Переключаем статус
      if (document.status === 'draft') {
        return await this.postDocument(documentId);
      } else {
        return await this.unpostDocument(documentId);
      }
    } catch (error) {
      inventoryLogger.error('Error toggling document status', { error: getErrorMessage(error), documentId });
      throw error;
    } finally {
      endOperation();
    }
  }

  /**
   * Получает статистику по статусам документов
   */
  async getDocumentStatusStats(): Promise<{
    draft: number;
    posted: number;
    total: number;
  }> {
    const endOperation = inventoryLogger.startOperation('getDocumentStatusStats');
    
    try {
      const stats = await db
        .select({
          status: documents.status,
          count: sql<number>`count(*)`
        })
        .from(documents)
        .groupBy(documents.status);
      
      const result = {
        draft: 0,
        posted: 0,
        total: 0
      };
      
      for (const stat of stats) {
        result[stat.status as 'draft' | 'posted'] = Number(stat.count);
        result.total += Number(stat.count);
      }
      
      inventoryLogger.info('Document status stats retrieved', result);
      return result;
    } catch (error) {
      inventoryLogger.error('Error getting document status stats', { error: getErrorMessage(error) });
      throw error;
    } finally {
      endOperation();
    }
  }
}

export const documentStatusService = new DocumentStatusService();