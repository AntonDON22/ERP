/**
 * Сервис пагинации для API endpoints
 * Обеспечивает безопасную постраничную загрузку с защитой от SQL инъекций
 */

import { logger } from "../../shared/logger";

interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "asc" | "desc";
}

interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationService {
  private readonly DEFAULT_LIMIT = 50;
  private readonly MAX_LIMIT = 1000;
  private readonly DEFAULT_PAGE = 1;

  // Безопасные поля для сортировки (защита от SQL инъекций)
  private readonly SAFE_SORT_FIELDS = new Set([
    "id",
    "name",
    "sku",
    "price",
    "createdAt",
    "updatedAt",
    "quantity",
    "type",
    "status",
    "date",
  ]);

  /**
   * Нормализует параметры пагинации
   */
  // ✅ ИСПРАВЛЕНО: Типизация вместо any
  normalizeParams(params: Partial<PaginationParams>): Required<PaginationParams> {
    const page = Math.max(1, parseInt(String(params.page) || String(this.DEFAULT_PAGE)));
    const limit = Math.min(
      Math.max(1, parseInt(String(params.limit) || String(this.DEFAULT_LIMIT))),
      this.MAX_LIMIT
    );
    const offset = (page - 1) * limit;

    // Валидация и санитизация сортировки
    let sort = "id";
    let order: "asc" | "desc" = "desc";

    if (params.sort && this.SAFE_SORT_FIELDS.has(params.sort)) {
      sort = params.sort;
    }

    if (params.order === "asc" || params.order === "desc") {
      order = params.order;
    }

    return { page, limit, offset, sort, order };
  }

  /**
   * Создает результат пагинации
   */
  createResult<T>(
    data: T[],
    total: number,
    params: Required<PaginationParams>
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / params.limit);

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      },
    };
  }

  /**
   * Логирует использование пагинации для мониторинга
   */
  logUsage(endpoint: string, params: Required<PaginationParams>, total: number): void {
    logger.debug("Пагинация применена", {
      endpoint,
      page: params.page,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      order: params.order,
      total,
      loadedRecords: Math.min(params.limit, total - params.offset),
    });
  }

  /**
   * Генерирует SQL LIMIT и OFFSET для безопасного использования
   */
  getSqlLimitOffset(params: Required<PaginationParams>): { limit: number; offset: number } {
    return {
      limit: params.limit,
      offset: params.offset,
    };
  }

  /**
   * Генерирует SQL ORDER BY для безопасного использования
   */
  getSqlOrderBy(params: Required<PaginationParams>): string {
    // Дополнительная защита - белый список полей
    if (!this.SAFE_SORT_FIELDS.has(params.sort)) {
      params.sort = "id";
    }

    return `ORDER BY ${params.sort} ${params.order.toUpperCase()}`;
  }

  /**
   * Проверяет эффективность запроса пагинации
   */
  validateEfficiency(params: Required<PaginationParams>, total: number): void {
    const maxReasonableOffset = 10000; // Предел для эффективной пагинации

    if (params.offset > maxReasonableOffset) {
      logger.warn("Неэффективная пагинация - большой offset", {
        page: params.page,
        offset: params.offset,
        total,
        recommendation: "Рассмотрите использование cursor-based пагинации",
      });
    }

    if (params.limit > 500) {
      logger.warn("Большой лимит пагинации может снизить производительность", {
        limit: params.limit,
        recommendation: "Рекомендуется лимит до 500 записей",
      });
    }
  }
}

export const paginationService = new PaginationService();
