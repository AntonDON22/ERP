import { useEffect, useRef, useCallback } from 'react';

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
      console.warn(
        `🐌 Slow render detected in ${componentName}:`,
        `${renderTime.toFixed(2)}ms (threshold: ${slowRenderThreshold}ms)`
      );
    }

    // Логирование ререндеров
    if (logRerenders && !isFirstRenderRef.current) {
      console.log(
        `🔄 Re-render #${metrics.renderCount} in ${componentName}:`,
        `${renderTime.toFixed(2)}ms`
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
      console.log(
        `📝 Props changed in ${componentName}:`,
        changedProps,
        'Changed props:', changedProps.reduce((acc, prop) => {
          const cleanProp = prop.startsWith('-') ? prop.slice(1) : prop;
          acc[prop] = {
            from: previousProps[cleanProp],
            to: props[cleanProp]
          };
          return acc;
        }, {} as Record<string, any>)
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
    console.group(`📊 Performance Summary for ${componentName}`);
    console.log(`Render count: ${metrics.renderCount}`);
    console.log(`Last render time: ${metrics.lastRenderTime.toFixed(2)}ms`);
    console.log(`Average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
    console.log(`Total render time: ${metrics.totalRenderTime.toFixed(2)}ms`);
    
    if (Object.keys(metrics.propChanges).length > 0) {
      console.log('Prop changes frequency:', metrics.propChanges);
    }

    // Предупреждения о производительности
    if (metrics.averageRenderTime > slowRenderThreshold) {
      console.warn(`⚠️ Average render time exceeds threshold (${slowRenderThreshold}ms)`);
    }

    if (metrics.renderCount > 50) {
      console.warn(`⚠️ High render count detected (${metrics.renderCount} renders)`);
    }

    const frequentlyChangingProps = Object.entries(metrics.propChanges)
      .filter(([, count]) => count > 10)
      .map(([prop]) => prop);

    if (frequentlyChangingProps.length > 0) {
      console.warn(`⚠️ Frequently changing props:`, frequentlyChangingProps);
    }

    console.groupEnd();
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