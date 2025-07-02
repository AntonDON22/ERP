/**
 * Тест времени рендеринга таблиц
 * Измеряет скорость загрузки и отображения таблиц в React-интерфейсе
 */

import { test, expect, Page } from '@playwright/test';

interface TableRenderResult {
  page: string;
  loadTime: number;
  tableRenderTime: number;
  totalTime: number;
  status: 'excellent' | 'good' | 'needs-optimization';
  rowCount: number;
}

// Пороги производительности (в миллисекундах)
const RENDER_THRESHOLDS = {
  EXCELLENT: 500,
  GOOD: 1500,
} as const;

// Цветовые коды для консоли
const COLORS = {
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
} as const;

/**
 * Определяет статус производительности по времени рендеринга
 */
function getRenderStatus(renderTime: number): TableRenderResult['status'] {
  if (renderTime <= RENDER_THRESHOLDS.EXCELLENT) return 'excellent';
  if (renderTime <= RENDER_THRESHOLDS.GOOD) return 'good';
  return 'needs-optimization';
}

/**
 * Форматирует результат с цветовой градацией
 */
function formatRenderResult(result: TableRenderResult): string {
  const { page, totalTime, status } = result;
  
  let color: string;
  let statusText: string;
  
  switch (status) {
    case 'excellent':
      color = COLORS.GREEN;
      statusText = 'ОТЛИЧНО';
      break;
    case 'good':
      color = COLORS.YELLOW;
      statusText = 'ХОРОШО';
      break;
    case 'needs-optimization':
      color = COLORS.RED;
      statusText = 'ТРЕБУЕТ ОПТИМИЗАЦИИ';
      break;
  }

  return `${color}${COLORS.BOLD}${page}${COLORS.RESET}${color} - ${totalTime}ms [${statusText}]${COLORS.RESET}`;
}

/**
 * Измеряет время рендеринга таблицы на странице
 */
async function measureTableRender(page: Page, url: string, pageTitle: string): Promise<TableRenderResult> {
  // Засекаем время начала загрузки
  const startTime = Date.now();
  
  // Переходим на страницу
  await page.goto(url);
  
  // Время завершения загрузки страницы
  const loadEndTime = Date.now();
  const loadTime = loadEndTime - startTime;
  
  // Ждем появления таблицы - пробуем разные селекторы
  let tableSelector: string;
  let tableElement;
  
  const possibleSelectors = [
    '[data-testid="data-table"]',
    '.data-table',
    'table',
    '[role="table"]',
    '.table-container table',
    '.responsive-table-wrapper table'
  ];
  
  for (const selector of possibleSelectors) {
    try {
      tableElement = await page.locator(selector).first();
      if (await tableElement.isVisible({ timeout: 1000 })) {
        tableSelector = selector;
        break;
      }
    } catch (e) {
      // Продолжаем поиск
    }
  }
  
  if (!tableElement || !tableSelector!) {
    throw new Error(`Таблица не найдена на странице ${pageTitle}`);
  }
  
  // Ждем полной загрузки таблицы
  await tableElement.waitFor({ state: 'visible' });
  
  // Ждем загрузки строк таблицы
  const rowsSelector = `${tableSelector} tbody tr, ${tableSelector} tr`;
  await page.waitForSelector(rowsSelector, { timeout: 5000 });
  
  // Время завершения рендеринга таблицы
  const tableRenderEndTime = Date.now();
  const tableRenderTime = tableRenderEndTime - loadEndTime;
  const totalTime = tableRenderEndTime - startTime;
  
  // Подсчитываем количество строк
  const rows = await page.locator(rowsSelector).count();
  
  const result: TableRenderResult = {
    page: pageTitle,
    loadTime,
    tableRenderTime,
    totalTime,
    status: getRenderStatus(totalTime),
    rowCount: rows,
  };
  
  return result;
}

test.describe('Table Render Time Performance Tests', () => {
  const results: TableRenderResult[] = [];
  const BASE_URL = 'http://localhost:5000';

  test.beforeEach(async ({ page }) => {
    // Устанавливаем viewport для консистентности
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('должен измерить время рендеринга таблицы /products', async ({ page }) => {
    const url = `${BASE_URL}/products`;
    const result = await measureTableRender(page, url, 'Products');
    
    console.log('\n📊 Результат замера рендеринга:');
    console.log(formatRenderResult(result));
    console.log(`⏱️  Загрузка страницы: ${result.loadTime}ms`);
    console.log(`🏗️  Рендеринг таблицы: ${result.tableRenderTime}ms`);
    console.log(`📊 Строк в таблице: ${result.rowCount}`);
    
    results.push(result);
    
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
    
    if (result.status === 'needs-optimization') {
      console.warn(`⚠️  Медленный рендеринг: ${result.totalTime}ms превышает порог ${RENDER_THRESHOLDS.GOOD}ms`);
    }
  });

  test('должен измерить время рендеринга таблицы /documents', async ({ page }) => {
    const url = `${BASE_URL}/documents`;
    const result = await measureTableRender(page, url, 'Documents');
    
    console.log('\n📊 Результат замера рендеринга:');
    console.log(formatRenderResult(result));
    console.log(`⏱️  Загрузка страницы: ${result.loadTime}ms`);
    console.log(`🏗️  Рендеринг таблицы: ${result.tableRenderTime}ms`);
    console.log(`📊 Строк в таблице: ${result.rowCount}`);
    
    results.push(result);
    
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
    
    if (result.status === 'needs-optimization') {
      console.warn(`⚠️  Медленный рендеринг: ${result.totalTime}ms превышает порог ${RENDER_THRESHOLDS.GOOD}ms`);
    }
  });

  test('должен измерить время рендеринга таблицы /inventory', async ({ page }) => {
    const url = `${BASE_URL}/inventory`;
    const result = await measureTableRender(page, url, 'Inventory');
    
    console.log('\n📊 Результат замера рендеринга:');
    console.log(formatRenderResult(result));
    console.log(`⏱️  Загрузка страницы: ${result.loadTime}ms`);
    console.log(`🏗️  Рендеринг таблицы: ${result.tableRenderTime}ms`);
    console.log(`📊 Строк в таблице: ${result.rowCount}`);
    
    results.push(result);
    
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
    
    if (result.status === 'needs-optimization') {
      console.warn(`⚠️  Медленный рендеринг: ${result.totalTime}ms превышает порог ${RENDER_THRESHOLDS.GOOD}ms`);
    }
  });

  test('должен измерить время рендеринга таблицы /warehouses', async ({ page }) => {
    const url = `${BASE_URL}/warehouses`;
    const result = await measureTableRender(page, url, 'Warehouses');
    
    console.log('\n📊 Результат замера рендеринга:');
    console.log(formatRenderResult(result));
    console.log(`⏱️  Загрузка страницы: ${result.loadTime}ms`);
    console.log(`🏗️  Рендеринг таблицы: ${result.tableRenderTime}ms`);
    console.log(`📊 Строк в таблице: ${result.rowCount}`);
    
    results.push(result);
    
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
    
    if (result.status === 'needs-optimization') {
      console.warn(`⚠️  Медленный рендеринг: ${result.totalTime}ms превышает порог ${RENDER_THRESHOLDS.GOOD}ms`);
    }
  });

  test('должен измерить время рендеринга таблицы /orders', async ({ page }) => {
    const url = `${BASE_URL}/orders`;
    const result = await measureTableRender(page, url, 'Orders');
    
    console.log('\n📊 Результат замера рендеринга:');
    console.log(formatRenderResult(result));
    console.log(`⏱️  Загрузка страницы: ${result.loadTime}ms`);
    console.log(`🏗️  Рендеринг таблицы: ${result.tableRenderTime}ms`);
    console.log(`📊 Строк в таблице: ${result.rowCount}`);
    
    results.push(result);
    
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
    
    if (result.status === 'needs-optimization') {
      console.warn(`⚠️  Медленный рендеринг: ${result.totalTime}ms превышает порог ${RENDER_THRESHOLDS.GOOD}ms`);
    }
  });

  test('должен показать сводный отчет рендеринга таблиц', async () => {
    const totalTests = results.length;
    const excellentCount = results.filter(r => r.status === 'excellent').length;
    const goodCount = results.filter(r => r.status === 'good').length;
    const needsOptimizationCount = results.filter(r => r.status === 'needs-optimization').length;

    const averageTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / totalTests;
    const averageLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / totalTests;
    const averageRenderTime = results.reduce((sum, r) => sum + r.tableRenderTime, 0) / totalTests;
    const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);

    const maxTime = Math.max(...results.map(r => r.totalTime));
    const minTime = Math.min(...results.map(r => r.totalTime));

    console.log('\n' + '='.repeat(70));
    console.log(`${COLORS.BOLD}🏗️  СВОДНЫЙ ОТЧЕТ РЕНДЕРИНГА ТАБЛИЦ${COLORS.RESET}`);
    console.log('='.repeat(70));
    console.log(`📊 Всего таблиц: ${totalTests}`);
    console.log(`${COLORS.GREEN}⚡ Отличных: ${excellentCount} (<${RENDER_THRESHOLDS.EXCELLENT}ms)${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}✅ Хороших: ${goodCount} (${RENDER_THRESHOLDS.EXCELLENT}-${RENDER_THRESHOLDS.GOOD}ms)${COLORS.RESET}`);
    console.log(`${COLORS.RED}🔧 Требуют оптимизации: ${needsOptimizationCount} (>${RENDER_THRESHOLDS.GOOD}ms)${COLORS.RESET}`);
    console.log(`⏱️  Среднее общее время: ${averageTotalTime.toFixed(1)}ms`);
    console.log(`📥 Среднее время загрузки: ${averageLoadTime.toFixed(1)}ms`);
    console.log(`🏗️  Среднее время рендеринга: ${averageRenderTime.toFixed(1)}ms`);
    console.log(`📊 Всего строк: ${totalRows}`);
    console.log(`🏃 Быстрейшая: ${minTime}ms`);
    console.log(`🐌 Медленнейшая: ${maxTime}ms`);
    console.log('='.repeat(70));

    // Детальная таблица результатов
    console.log('\n📋 Детальные результаты:');
    results.forEach(result => {
      console.log(`  ${formatRenderResult(result)}`);
      console.log(`    Загрузка: ${result.loadTime}ms | Рендеринг: ${result.tableRenderTime}ms | Строк: ${result.rowCount}`);
    });

    expect(totalTests).toBeGreaterThan(0);
    expect(averageTotalTime).toBeGreaterThan(0);
  });
});