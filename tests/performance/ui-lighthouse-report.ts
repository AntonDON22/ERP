/**
 * Lighthouse анализ производительности UI
 * Использует Playwright для тестирования скорости загрузки страниц
 */

import { test, expect, chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

interface LighthouseResult {
  url: string;
  performanceScore: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  tbt: number; // Total Blocking Time
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

// Пороги производительности Lighthouse
const LIGHTHOUSE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  NEEDS_IMPROVEMENT: 50,
} as const;

// Цветовые коды для консоли
const COLORS = {
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  ORANGE: '\x1b[38;5;208m',
  RED: '\x1b[31m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
} as const;

/**
 * Определяет статус производительности по скору
 */
function getPerformanceStatus(score: number): LighthouseResult['status'] {
  if (score >= LIGHTHOUSE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= LIGHTHOUSE_THRESHOLDS.GOOD) return 'good';
  if (score >= LIGHTHOUSE_THRESHOLDS.NEEDS_IMPROVEMENT) return 'needs-improvement';
  return 'poor';
}

/**
 * Форматирует результат с цветовой градацией
 */
function formatLighthouseResult(result: LighthouseResult): string {
  const { url, performanceScore, status } = result;
  
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
    case 'needs-improvement':
      color = COLORS.ORANGE;
      statusText = 'ТРЕБУЕТ УЛУЧШЕНИЯ';
      break;
    case 'poor':
      color = COLORS.RED;
      statusText = 'ПЛОХО';
      break;
  }

  return `${color}${COLORS.BOLD}${url}${COLORS.RESET}${color} - Score: ${performanceScore} [${statusText}]${COLORS.RESET}`;
}

/**
 * Запускает Lighthouse анализ для указанного URL
 */
async function runLighthouseAnalysis(url: string): Promise<LighthouseResult> {
  let chrome;
  
  try {
    // Запускаем Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
    });

    // Запускаем Lighthouse
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ['performance'],
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    });

    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse не вернул результаты');
    }

    const lhr = runnerResult.lhr;
    const performanceScore = Math.round((lhr.categories.performance.score || 0) * 100);
    
    // Извлекаем ключевые метрики
    const metrics = lhr.audits;
    const fcp = metrics['first-contentful-paint']?.numericValue || 0;
    const lcp = metrics['largest-contentful-paint']?.numericValue || 0;
    const cls = metrics['cumulative-layout-shift']?.numericValue || 0;
    const tbt = metrics['total-blocking-time']?.numericValue || 0;

    // Создаем папку для отчетов если не существует
    const reportsDir = join(process.cwd(), 'lighthouse-reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // Сохраняем JSON отчет
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportName = `lighthouse-${url.replace(/[^\w]/g, '_')}-${timestamp}`;
    
    writeFileSync(
      join(reportsDir, `${reportName}.json`),
      JSON.stringify(lhr, null, 2)
    );

    // Сохраняем HTML отчет
    const html = runnerResult.report;
    if (html) {
      const htmlContent = Array.isArray(html) ? html.join('') : html;
      writeFileSync(join(reportsDir, `${reportName}.html`), htmlContent);
    }

    const result: LighthouseResult = {
      url,
      performanceScore,
      fcp: Math.round(fcp),
      lcp: Math.round(lcp),
      cls: Math.round(cls * 1000) / 1000,
      tbt: Math.round(tbt),
      status: getPerformanceStatus(performanceScore),
    };

    console.log(`\n📊 Lighthouse анализ завершен для ${url}`);
    console.log(`📁 Отчеты сохранены: ${reportName}.json, ${reportName}.html`);

    return result;

  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

test.describe('Lighthouse Performance Analysis', () => {
  const results: LighthouseResult[] = [];
  const BASE_URL = 'http://localhost:5000';

  test.beforeAll(async () => {
    // Ждем чтобы сервер точно запустился
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('должен анализировать производительность страницы /products', async () => {
    const url = `${BASE_URL}/products`;
    const result = await runLighthouseAnalysis(url);
    
    console.log('\n📊 Результат Lighthouse анализа:');
    console.log(formatLighthouseResult(result));
    console.log(`🎨 First Contentful Paint: ${result.fcp}ms`);
    console.log(`🖼️  Largest Contentful Paint: ${result.lcp}ms`);
    console.log(`📏 Cumulative Layout Shift: ${result.cls}`);
    console.log(`⏳ Total Blocking Time: ${result.tbt}ms`);
    
    results.push(result);
    
    expect(result.performanceScore).toBeGreaterThan(0);
    
    if (result.status === 'poor') {
      console.warn(`⚠️  Низкий Performance Score: ${result.performanceScore} требует внимания`);
    }
  });

  test('должен анализировать производительность страницы /documents', async () => {
    const url = `${BASE_URL}/documents`;
    const result = await runLighthouseAnalysis(url);
    
    console.log('\n📊 Результат Lighthouse анализа:');
    console.log(formatLighthouseResult(result));
    console.log(`🎨 First Contentful Paint: ${result.fcp}ms`);
    console.log(`🖼️  Largest Contentful Paint: ${result.lcp}ms`);
    console.log(`📏 Cumulative Layout Shift: ${result.cls}`);
    console.log(`⏳ Total Blocking Time: ${result.tbt}ms`);
    
    results.push(result);
    
    expect(result.performanceScore).toBeGreaterThan(0);
    
    if (result.status === 'poor') {
      console.warn(`⚠️  Низкий Performance Score: ${result.performanceScore} требует внимания`);
    }
  });

  test('должен анализировать производительность главной страницы /', async () => {
    const url = `${BASE_URL}/`;
    const result = await runLighthouseAnalysis(url);
    
    console.log('\n📊 Результат Lighthouse анализа:');
    console.log(formatLighthouseResult(result));
    console.log(`🎨 First Contentful Paint: ${result.fcp}ms`);
    console.log(`🖼️  Largest Contentful Paint: ${result.lcp}ms`);
    console.log(`📏 Cumulative Layout Shift: ${result.cls}`);
    console.log(`⏳ Total Blocking Time: ${result.tbt}ms`);
    
    results.push(result);
    
    expect(result.performanceScore).toBeGreaterThan(0);
    
    if (result.status === 'poor') {
      console.warn(`⚠️  Низкий Performance Score: ${result.performanceScore} требует внимания`);
    }
  });

  test('должен показать сводный отчет Lighthouse', async () => {
    const totalTests = results.length;
    const excellentCount = results.filter(r => r.status === 'excellent').length;
    const goodCount = results.filter(r => r.status === 'good').length;
    const needsImprovementCount = results.filter(r => r.status === 'needs-improvement').length;
    const poorCount = results.filter(r => r.status === 'poor').length;

    const averageScore = results.reduce((sum, r) => sum + r.performanceScore, 0) / totalTests;
    const averageFCP = results.reduce((sum, r) => sum + r.fcp, 0) / totalTests;
    const averageLCP = results.reduce((sum, r) => sum + r.lcp, 0) / totalTests;

    console.log('\n' + '='.repeat(70));
    console.log(`${COLORS.BOLD}🚀 СВОДНЫЙ ОТЧЕТ LIGHTHOUSE ПРОИЗВОДИТЕЛЬНОСТИ${COLORS.RESET}`);
    console.log('='.repeat(70));
    console.log(`📊 Всего страниц: ${totalTests}`);
    console.log(`${COLORS.GREEN}🌟 Отличных: ${excellentCount} (≥90)${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}✅ Хороших: ${goodCount} (70-89)${COLORS.RESET}`);
    console.log(`${COLORS.ORANGE}⚠️  Требуют улучшения: ${needsImprovementCount} (50-69)${COLORS.RESET}`);
    console.log(`${COLORS.RED}❌ Плохих: ${poorCount} (<50)${COLORS.RESET}`);
    console.log(`🎯 Средний Performance Score: ${averageScore.toFixed(1)}`);
    console.log(`🎨 Средний FCP: ${averageFCP.toFixed(0)}ms`);
    console.log(`🖼️  Средний LCP: ${averageLCP.toFixed(0)}ms`);
    console.log('='.repeat(70));

    // Детальная таблица результатов
    console.log('\n📋 Детальные результаты:');
    results.forEach(result => {
      console.log(`  ${formatLighthouseResult(result)}`);
      console.log(`    FCP: ${result.fcp}ms | LCP: ${result.lcp}ms | CLS: ${result.cls} | TBT: ${result.tbt}ms`);
    });

    expect(totalTests).toBeGreaterThan(0);
    expect(averageScore).toBeGreaterThan(0);
  });
});