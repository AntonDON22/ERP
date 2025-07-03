import {
  insertContractorSchema,
  type InsertContractor,
  type Contractor,
} from "../../shared/schema";
import { BaseService } from "./baseService";

export class ContractorService extends BaseService<Contractor, InsertContractor> {
  protected entityName = "Contractor";
  protected pluralName = "Contractors";
  protected storageMethodPrefix = "Contractor";
  protected insertSchema = insertContractorSchema;
  protected updateSchema = insertContractorSchema.partial();

  protected async validateImportData(data: unknown): Promise<InsertContractor> {
    // Нормализация данных Excel импорта для контрагентов
    const contractorData = data as Record<string, unknown>;
    
    return insertContractorSchema.parse({
      name: contractorData.name || contractorData.Название || "Без названия",
      website: String(contractorData.website || contractorData.Вебсайт || ""),
    });
  }
}

export const contractorService = new ContractorService();
