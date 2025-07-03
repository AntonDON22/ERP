/**
 * 🔧 Стандартизированные интерфейсы для сервисов ERP системы
 * 
 * Определяет единые контракты для всех сервисов системы
 * Обеспечивает type safety и архитектурную согласованность
 */

import { z } from "zod";

/**
 * 📋 Базовый интерфейс для всех сущностей системы
 */
export interface BaseEntity {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 🔄 Результат операций множественного удаления
 */
export interface BatchDeleteResult {
  deletedCount: number;
  results: Array<{
    id: number;
    status: "deleted" | "not_found" | "error";
    error?: string;
  }>;
}

/**
 * 📊 Результат операций импорта
 */
export interface ImportResult<T> {
  successCount: number;
  errorCount: number;
  results: T[];
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
}

/**
 * 🎯 Стандартизированные параметры поиска
 */
export interface SearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
}

/**
 * 📈 Статистика операций
 */
export interface OperationStats {
  entity: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 🏗️ Основной интерфейс для всех сервисов CRUD операций
 */
export interface ICRUDService<T extends BaseEntity, InsertT, UpdateT = Partial<InsertT>> {
  // Основные CRUD операции
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | undefined>;
  create(data: InsertT): Promise<T>;
  update(id: number, data: UpdateT): Promise<T | undefined>;
  delete(id: number): Promise<boolean>;
  
  // Batch операции
  deleteMultiple(ids: number[]): Promise<BatchDeleteResult>;
  
  // Импорт/экспорт
  import(data: any[]): Promise<ImportResult<T>>;
}