import {
  insertDocumentSchema,
  insertDocumentItemSchema,
  type InsertDocument,
  type DocumentRecord,
  type CreateDocumentItem,
} from "../../shared/schema";
import { transactionService } from "./transactionService";
import { getMoscowDateForDocument } from "../../shared/timeUtils";
import { logger, apiLogger } from "../../shared/logger";
import { toNumber } from "@shared/utils";
import { BaseService } from "./baseService";

export class DocumentService extends BaseService<DocumentRecord, InsertDocument> {
  protected entityName = "Document";
  protected pluralName = "Documents";
  protected storageMethodPrefix = "Document";
  protected insertSchema = insertDocumentSchema;
  protected updateSchema = insertDocumentSchema.partial();

  protected async validateImportData(data: unknown): Promise<InsertDocument> {
    return insertDocumentSchema.parse(data);
  }

  // Переопределяем метод update для поддержки позиций документов
  async update(
    id: number,
    data: Partial<InsertDocument>,
    items?: Array<{ productId: number; quantity: string | number }>
  ): Promise<DocumentRecord | undefined> {
    const validatedData = this.updateSchema.parse(data);
    logger.info('🔍 DocumentService.update validatedData:', { validatedData });

    if (items && items.length > 0) {
      const processedItems = items.map(item => ({
        productId: item.productId,
        quantity: toNumber(item.quantity),
      }));

      return await transactionService.updateDocumentWithInventory(id, validatedData, processedItems);
    } else {
      return await super.update(id, validatedData);
    }
  }

  // Переопределяем метод delete для использования транзакционного удаления
  async delete(id: number): Promise<boolean> {
    return await transactionService.deleteDocumentWithInventory(id);
  }

  // Переопределяем метод deleteMultiple для использования транзакционного удаления
  async deleteMultiple(
    ids: number[]
  ): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID документов для удаления");
    }

    const validIds = ids.filter((id) => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID документов");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await transactionService.deleteDocumentWithInventory(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        logger.error(`Error deleting document ${id}`, {
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
        throw error;
      }
    }

    return { deletedCount, results };
  }

  async createReceipt(
    documentData: InsertDocument,
    items: CreateDocumentItem[]
  ): Promise<DocumentRecord> {
    // Валидация документа
    const validatedDocument = insertDocumentSchema.parse(documentData);

    // Автогенерация названия с правильным типом
    if (!validatedDocument.name || validatedDocument.name.trim().length === 0) {
      validatedDocument.name = this.generateDocumentName(validatedDocument.type);
    }

    // Валидация позиций
    const validatedItems = items.map((item) => insertDocumentItemSchema.parse(item));

    // Используем новый транзакционный метод для полной целостности данных
    return await transactionService.createDocumentWithInventory(validatedDocument, validatedItems);
  }

  private getDocumentTypeName(type: string): string {
    const typeNames = {
      income: "Оприходование",
      outcome: "Списание",
      return: "Возврат",
    };
    return typeNames[type as keyof typeof typeNames] || type;
  }

  private generateDocumentName(type: string): string {
    const dateStr = getMoscowDateForDocument();
    const typeName = this.getDocumentTypeName(type);

    // Простая генерация номера (в реальной системе нужно учитывать concurrent access)
    const number = Math.floor(Math.random() * 1000) + 1;

    return `${typeName} ${dateStr}-${number}`;
  }
}

export const documentService = new DocumentService();
