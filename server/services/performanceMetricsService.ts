import { cacheService } from './cacheService';
import { logger } from '@shared/logger';

interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  databaseQueryCount: number;
  totalRequests: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface MetricRecord {
  timestamp: number;
  responseTime: number;
  endpoint: string;
  cacheHit: boolean;
  dbQueries: number;
}

export class PerformanceMetricsService {
  private static metrics: MetricRecord[] = [];
  private static readonly MAX_RECORDS = 1000; // Последние 1000 запросов
  private static readonly CACHE_KEY = 'performance:metrics';

  // Записать метрику запроса
  static recordRequest(endpoint: string, responseTime: number, cacheHit = false, dbQueries = 1) {
    const record: MetricRecord = {
      timestamp: Date.now(),
      responseTime,
      endpoint,
      cacheHit,
      dbQueries
    };

    this.metrics.push(record);

    // Ограничиваем количество записей
    if (this.metrics.length > this.MAX_RECORDS) {
      this.metrics = this.metrics.slice(-this.MAX_RECORDS);
    }

    logger.debug('Performance metric recorded', record);
  }

  // Получить текущие метрики производительности
  static getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        cacheHitRate: 0,
        averageResponseTime: 0,
        databaseQueryCount: 0,
        totalRequests: 0,
        systemHealth: 'healthy'
      };
    }

    const totalRequests = this.metrics.length;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;
    
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalResponseTime / totalRequests;
    
    const totalDbQueries = this.metrics.reduce((sum, m) => sum + m.dbQueries, 0);

    // Определение здоровья системы
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (averageResponseTime > 1000) {
      systemHealth = 'critical';
    } else if (averageResponseTime > 500) {
      systemHealth = 'warning';
    }

    return {
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      databaseQueryCount: totalDbQueries,
      totalRequests,
      systemHealth
    };
  }

  // Получить подробную статистику по endpoint'ам
  static getEndpointStats() {
    const endpointMap = new Map<string, {
      totalRequests: number;
      avgResponseTime: number;
      cacheHitRate: number;
      totalDbQueries: number;
    }>();

    this.metrics.forEach(metric => {
      const existing = endpointMap.get(metric.endpoint) || {
        totalRequests: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        totalDbQueries: 0
      };

      existing.totalRequests++;
      existing.avgResponseTime += metric.responseTime;
      existing.totalDbQueries += metric.dbQueries;
      if (metric.cacheHit) {
        existing.cacheHitRate++;
      }

      endpointMap.set(metric.endpoint, existing);
    });

    // Вычисляем средние значения
    const result: Record<string, any> = {};
    endpointMap.forEach((stats, endpoint) => {
      result[endpoint] = {
        ...stats,
        avgResponseTime: Math.round(stats.avgResponseTime / stats.totalRequests),
        cacheHitRate: Math.round((stats.cacheHitRate / stats.totalRequests) * 100)
      };
    });

    return result;
  }

  // Получить метрики кеша
  static async getCacheMetrics() {
    try {
      // Базовые метрики кеша
      return {
        hit_rate: this.getMetrics().cacheHitRate,
        memory_usage: 'Redis/Memory',
        total_keys: this.metrics.length,
        status: 'active'
      };
    } catch (error) {
      logger.warn('Failed to get cache metrics', { error });
      return {
        hit_rate: 0,
        memory_usage: 'N/A',
        total_keys: 0,
        status: 'fallback_memory'
      };
    }
  }

  // Очистить старые метрики (старше 24 часов)
  static cleanupOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 часа
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    logger.info('Old performance metrics cleaned up', { 
      recordsRemoved: this.MAX_RECORDS - this.metrics.length 
    });
  }

  // Получить тренды производительности за последний час
  static getPerformanceTrends() {
    const hourAgo = Date.now() - (60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > hourAgo);

    if (recentMetrics.length === 0) {
      return { trend: 'stable', improvement: 0 };
    }

    // Разделяем на две половины для сравнения
    const midpoint = Math.floor(recentMetrics.length / 2);
    const firstHalf = recentMetrics.slice(0, midpoint);
    const secondHalf = recentMetrics.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.responseTime, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.responseTime, 0) / secondHalf.length;

    const improvement = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (improvement > 10) {
      trend = 'improving';
    } else if (improvement < -10) {
      trend = 'degrading';
    }

    return {
      trend,
      improvement: Math.round(improvement * 100) / 100
    };
  }
}