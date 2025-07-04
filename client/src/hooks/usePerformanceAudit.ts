import { useEffect, useRef, useCallback } from 'react';
import { clientLogger } from "@/lib/clientLogger";

/**
 * 🔍 ХУК ДЛЯ АУДИТА ПРОИЗВОДИТЕЛЬНОСТИ REACT КОМПОНЕНТОВ
 * 
 * Отслеживает:
 * - Количество ререндеров компонента
 * - Время рендеринга
 * - Изменения в пропсах (что вызывает ререндеры)
 * - Memory leaks
 */

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
  propChanges: Record<string, number>;
}

interface UsePerformanceAuditOptions {
  componentName: string;
  logRerenders?: boolean;
  logPropChanges?: boolean;
  logSlowRenders?: boolean;
  slowRenderThreshold?: number; // мс
}

export function usePerformanceAudit(
  props: Record<string, unknown> = {},
  options: UsePerformanceAuditOptions
) {
  const {
    componentName,
    logRerenders = false,
    logPropChanges = false,
    logSlowRenders = true,
    slowRenderThreshold = 16 // 16ms = ~60fps
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    propChanges: {}
  });

  const previousPropsRef = useRef<Record<string, unknown>>(props);
  const renderStartTimeRef = useRef<number>(0);
  const isFirstRenderRef = useRef(true);

  // Запускаем таймер рендеринга
  const startRenderTimer = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  // Завершаем таймер и обновляем метрики
  const endRenderTimer = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    const metrics = metricsRef.current;
    
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;

    // Логирование медленных рендеров
    if (logSlowRenders && renderTime > slowRenderThreshold) {
      clientLogger.warn("performance", 
        `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (threshold: ${slowRenderThreshold}ms)`,
        { componentName, renderTime, threshold: slowRenderThreshold }
      );
    }

    // Логирование ререндеров
    if (logRerenders && !isFirstRenderRef.current) {
      clientLogger.debug("performance", 
        `🔄 Re-render #${metrics.renderCount} in ${componentName}: ${renderTime.toFixed(2)}ms`,
        { componentName, renderCount: metrics.renderCount, renderTime }
      );
    }

    isFirstRenderRef.current = false;
  }, [componentName, logRerenders, logSlowRenders, slowRenderThreshold]);

  // Анализ изменений пропсов
  useEffect(() => {
    if (isFirstRenderRef.current) return;

    const previousProps = previousPropsRef.current;
    const changedProps: string[] = [];

    // Проверяем изменения в пропсах
    Object.keys(props).forEach(key => {
      if (props[key] !== previousProps[key]) {
        changedProps.push(key);
        metricsRef.current.propChanges[key] = (metricsRef.current.propChanges[key] || 0) + 1;
      }
    });

    // Проверяем удаленные пропсы
    Object.keys(previousProps).forEach(key => {
      if (!(key in props)) {
        changedProps.push(`-${key}`);
      }
    });

    // Логирование изменений пропсов
    if (logPropChanges && changedProps.length > 0) {
      const changedPropsData = changedProps.reduce((acc, prop) => {
        const cleanProp = prop.startsWith('-') ? prop.slice(1) : prop;
        acc[prop] = {
          from: previousProps[cleanProp],
          to: props[cleanProp]
        };
        return acc;
      }, {} as Record<string, any>);
      
      clientLogger.debug("performance", 
        `📝 Props changed in ${componentName}`, 
        { changedProps, changedPropsData }
      );
    }

    previousPropsRef.current = { ...props };
  });

  // Запускаем таймер при каждом рендере
  startRenderTimer();

  // Завершаем таймер после рендера
  useEffect(() => {
    endRenderTimer();
  });

  // Функция для получения текущих метрик
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Функция для сброса метрик
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      propChanges: {}
    };
    isFirstRenderRef.current = true;
  }, []);

  // Функция для логирования сводки
  const logSummary = useCallback(() => {
    const metrics = metricsRef.current;
    
    const summary = {
      renderCount: metrics.renderCount,
      lastRenderTime: `${metrics.lastRenderTime.toFixed(2)}ms`,
      averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
      totalRenderTime: `${metrics.totalRenderTime.toFixed(2)}ms`,
      propChanges: metrics.propChanges
    };
    
    clientLogger.debug("performance", `Performance Summary for ${componentName}`, summary);

    // Предупреждения о производительности
    if (metrics.averageRenderTime > slowRenderThreshold) {
      clientLogger.warn("performance", `Average render time exceeds threshold (${slowRenderThreshold}ms)`);
    }

    if (metrics.renderCount > 50) {
      clientLogger.warn("performance", `High render count detected (${metrics.renderCount} renders)`);
    }

    const frequentlyChangingProps = Object.entries(metrics.propChanges)
      .filter(([, count]) => count > 10)
      .map(([prop]) => prop);

    if (frequentlyChangingProps.length > 0) {
      clientLogger.warn("performance", "Frequently changing props:", frequentlyChangingProps);
    }
  }, [componentName, slowRenderThreshold]);

  return {
    getMetrics,
    resetMetrics,
    logSummary,
    renderCount: metricsRef.current.renderCount,
    lastRenderTime: metricsRef.current.lastRenderTime,
    averageRenderTime: metricsRef.current.averageRenderTime
  };
}

/**
 * 🎯 СПЕЦИАЛИЗИРОВАННЫЙ ХУК ДЛЯ АУДИТА ТАБЛИЦ
 */
export function useTablePerformanceAudit(
  data: unknown[],
  componentName: string = 'DataTable'
) {
  const dataLengthRef = useRef(data.length);
  const previousDataRef = useRef(data);
  
  return usePerformanceAudit(
    { 
      dataLength: data.length,
      hasDataChanged: data !== previousDataRef.current 
    },
    {
      componentName,
      logRerenders: true,
      logPropChanges: true,
      logSlowRenders: true,
      slowRenderThreshold: data.length > 100 ? 50 : 16 // Более высокий порог для больших таблиц
    }
  );
}

/**
 * 🎯 СПЕЦИАЛИЗИРОВАННЫЙ ХУК ДЛЯ АУДИТА ФОРМ
 */
export function useFormPerformanceAudit(
  formValues: Record<string, unknown>,
  componentName: string = 'Form'
) {
  return usePerformanceAudit(
    formValues,
    {
      componentName,
      logRerenders: false, // Формы часто ререндерятся при вводе
      logPropChanges: false,
      logSlowRenders: true,
      slowRenderThreshold: 32 // Формы могут быть медленнее
    }
  );
}