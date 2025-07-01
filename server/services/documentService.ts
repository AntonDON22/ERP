import { storage } from "../storage";
import { insertDocumentSchema, insertDocumentItemSchema, type InsertDocument, type DocumentRecord, type CreateDocumentItem } from "../../shared/schema";
import { transactionService } from "./transactionService";
import { getMoscowDateForDocument } from "../../shared/timeUtils";
import { apiLogger } from "../../shared/logger";

export class DocumentService {
  async getAll(): Promise<DocumentRecord[]> {
    return await storage.getDocuments();
  }

  async getById(id: number): Promise<DocumentRecord | undefined> {
    return await storage.getDocument(id);
  }

  async create(data: InsertDocument): Promise<DocumentRecord> {
    const validatedData = insertDocumentSchema.parse(data);
    return await storage.createDocument(validatedData);
  }

  async update(id: number, data: Partial<InsertDocument>, items?: CreateDocumentItem[]): Promise<DocumentRecord | undefined> {
    const validatedData = insertDocumentSchema.partial().parse(data);
    
    if (items && items.length > 0) {
      // Если есть позиции товаров, используем транзакционное обновление
      return await transactionService.updateDocumentWithInventory(id, validatedData, items);
    } else {
      // Простое обновление документа без позиций
      return await storage.updateDocument(id, validatedData);
    }
  }

  async delete(id: number): Promise<boolean> {
    // Всегда используем транзакционное удаление для целостности данных
    return await transactionService.deleteDocumentWithInventory(id);
  }

  async deleteById(id: number): Promise<boolean> {
    return await this.delete(id);
  }

  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID документов для удаления");
    }

    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID документов");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await storage.deleteDocument(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: 'deleted' });
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        apiLogger.error(`Error deleting document ${id}`, { documentId: id, error: error instanceof Error ? error.message : String(error) });
        results.push({ id, status: 'error' });
      }
    }

    return { deletedCount, results };
  }

  async createReceipt(documentData: InsertDocument, items: CreateDocumentItem[]): Promise<DocumentRecord> {
    // Валидация документа
    const validatedDocument = insertDocumentSchema.parse(documentData);
    
    // Валидация позиций
    const validatedItems = items.map(item => insertDocumentItemSchema.parse(item));
    
    // Используем новый транзакционный метод для полной целостности данных
    return await transactionService.createDocumentWithInventory(validatedDocument, validatedItems);
  }

  private generateDocumentName(type: string): string {
    const dateStr = getMoscowDateForDocument();
    
    // Простая генерация номера (в реальной системе нужно учитывать concurrent access)
    const number = Math.floor(Math.random() * 1000) + 1;
    
    return `${type} ${dateStr}-${number}`;
  }
}

export const documentService = new DocumentService();