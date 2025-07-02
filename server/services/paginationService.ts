export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationService {
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  static parsePaginationParams(query: any): Required<PaginationParams> {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(
      this.MAX_LIMIT, 
      Math.max(1, parseInt(query.limit) || this.DEFAULT_LIMIT)
    );
    const sortBy = query.sortBy || 'id';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    return { page, limit, sortBy, sortOrder };
  }

  static getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createResult<T>(
    data: T[], 
    total: number, 
    params: Required<PaginationParams>
  ): PaginatedResult<T> {
    const { page, limit } = params;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Генерация SQL для сортировки с защитой от SQL инъекций
  static getSortClause(sortBy: string, sortOrder: 'asc' | 'desc', allowedFields: string[]): string {
    if (!allowedFields.includes(sortBy)) {
      sortBy = 'id'; // fallback к безопасному полю
    }
    return `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  }
}