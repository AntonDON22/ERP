import { storage } from "../storage";
import { insertContractorSchema, type InsertContractor, type Contractor } from "../../shared/schema";

export class ContractorService {
  async getAll(): Promise<Contractor[]> {
    return await storage.getContractors();
  }

  async getById(id: number): Promise<Contractor | undefined> {
    return await storage.getContractor(id);
  }

  async create(data: InsertContractor): Promise<Contractor> {
    const validatedData = insertContractorSchema.parse(data);
    return await storage.createContractor(validatedData);
  }

  async update(id: number, data: Partial<InsertContractor>): Promise<Contractor | undefined> {
    const validatedData = insertContractorSchema.partial().parse(data);
    return await storage.updateContractor(id, validatedData);
  }

  async delete(id: number): Promise<boolean> {
    return await storage.deleteContractor(id);
  }

  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID контрагентов для удаления");
    }

    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID контрагентов");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await storage.deleteContractor(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: 'deleted' });
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        console.error(`Error deleting contractor ${id}:`, error);
        results.push({ id, status: 'error' });
      }
    }

    return { deletedCount, results };
  }

  async import(contractors: any[]): Promise<Contractor[]> {
    if (!Array.isArray(contractors)) {
      throw new Error("Ожидается массив контрагентов");
    }

    const results = [];
    for (const contractorData of contractors) {
      try {
        const validatedData = {
          name: contractorData.name || contractorData.Название || "Без названия",
          website: String(contractorData.website || contractorData.Вебсайт || ""),
        };
        
        // Проверяем наличие ID для обновления
        const id = contractorData.ID || contractorData.id;
        let contractor;
        
        if (id && Number.isInteger(Number(id))) {
          const numericId = Number(id);
          // Обновляем существующего контрагента
          contractor = await storage.updateContractor(numericId, validatedData);
          if (!contractor) {
            // Если контрагент с таким ID не найден, создаем нового
            contractor = await storage.createContractor(validatedData);
          }
        } else {
          // Создаем нового контрагента
          contractor = await storage.createContractor(validatedData);
        }
        
        results.push(contractor);
      } catch (error) {
        console.error('Error importing contractor:', contractorData, error);
      }
    }

    return results;
  }
}

export const contractorService = new ContractorService();