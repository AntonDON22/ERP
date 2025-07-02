#!/usr/bin/env node

import { spawn } from 'child_process';
import { promisify } from 'util';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const exec = promisify(require('child_process').exec);

interface ResponsiveIssue {
  page: string;
  viewport: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  element?: string;
}

interface StylelintIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: string;
  text: string;
}

interface LighthouseIssue {
  category: string;
  score: number;
  issues: string[];
}

class AdaptiveTest {
  private issues: ResponsiveIssue[] = [];
  private stylelintIssues: StylelintIssue[] = [];
  private lighthouseIssues: LighthouseIssue[] = [];
  private baseUrl = 'http://localhost:5000';

  // Критичные размеры экранов для тестирования
  private readonly viewports = [
    { name: 'iPhone SE', width: 375, height: 667, critical: true },
    { name: 'iPhone 12', width: 390, height: 844, critical: true },
    { name: 'iPhone Mini', width: 360, height: 640, critical: true },
    { name: 'Samsung Galaxy S8', width: 360, height: 740, critical: true },
    { name: 'iPad Mini', width: 768, height: 1024, critical: false },
    { name: 'Desktop Small', width: 1024, height: 768, critical: false }
  ];

  private readonly testPages = [
    { path: '/', name: 'Главная панель', critical: true },
    { path: '/products', name: 'Товары', critical: true },
    { path: '/documents', name: 'Документы', critical: true },
    { path: '/inventory', name: 'Остатки', critical: true },
    { path: '/orders', name: 'Заказы', critical: false },
    { path: '/suppliers', name: 'Поставщики', critical: false },
    { path: '/contractors', name: 'Контрагенты', critical: false },
    { path: '/warehouses', name: 'Склады', critical: false },
    { path: '/responsive-test', name: 'Тест адаптивности', critical: true }
  ];

  async runStylelintCheck(): Promise<void> {
    console.log('🔍 Запуск Stylelint проверки...');
    
    try {
      const { stdout, stderr } = await exec('npx stylelint "**/*.css" "**/*.tsx" --formatter json --ignore-path .gitignore');
      
      if (stderr) {
        console.warn('⚠️ Stylelint предупреждения:', stderr);
      }

      if (stdout.trim()) {
        const results = JSON.parse(stdout);
        
        results.forEach((fileResult: any) => {
          fileResult.warnings.forEach((warning: any) => {
            this.stylelintIssues.push({
              file: fileResult.source,
              line: warning.line,
              column: warning.column,
              rule: warning.rule,
              severity: warning.severity,
              text: warning.text
            });
          });
        });
      }

      console.log(`✅ Stylelint проверка завершена. Найдено ${this.stylelintIssues.length} проблем.`);
    } catch (error: any) {
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          results.forEach((fileResult: any) => {
            fileResult.warnings.forEach((warning: any) => {
              this.stylelintIssues.push({
                file: fileResult.source,
                line: warning.line,
                column: warning.column,
                rule: warning.rule,
                severity: warning.severity,
                text: warning.text
              });
            });
          });
        } catch (parseError) {
          console.error('❌ Ошибка парсинга Stylelint результата:', parseError);
        }
      }
      console.log(`⚠️ Stylelint завершен с предупреждениями. Найдено ${this.stylelintIssues.length} проблем.`);
    }
  }

  async runLighthouseCheck(): Promise<void> {
    console.log('🚨 Запуск Lighthouse анализа...');
    
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    
    try {
      const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
      
      for (const category of categories) {
        const options = {
          logLevel: 'silent' as const,
          output: 'json' as const,
          onlyCategories: [category] as string[],
          port: chrome.port,
          emulatedFormFactor: 'mobile' as const,
          throttlingMethod: 'simulate' as const
        };

        const runnerResult = await lighthouse(`${this.baseUrl}/`, options);
        
        if (runnerResult && runnerResult.report) {
          const report = JSON.parse(runnerResult.report);
          const categoryResult = report.categories[category];
          
          if (categoryResult) {
            const issues: string[] = [];
            
            // Собираем неудачные аудиты
            Object.values(report.audits).forEach((audit: any) => {
              if (audit.score !== null && audit.score < 0.9 && categoryResult.auditRefs.some((ref: any) => ref.id === audit.id)) {
                issues.push(`${audit.title}: ${audit.displayValue || audit.description}`);
              }
            });

            this.lighthouseIssues.push({
              category: category,
              score: Math.round(categoryResult.score * 100),
              issues: issues
            });
          }
        }
      }

      console.log(`✅ Lighthouse анализ завершен для ${categories.length} категорий.`);
    } catch (error) {
      console.error('❌ Ошибка Lighthouse анализа:', error);
    } finally {
      await chrome.kill();
    }
  }

  async runResponsiveTests(): Promise<void> {
    console.log('📱 Запуск тестов адаптивности...');
    
    const browser = await chromium.launch();
    
    try {
      for (const viewport of this.viewports) {
        console.log(`   Тестирование ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }
        });
        const page = await context.newPage();

        for (const testPage of this.testPages) {
          try {
            await page.goto(`${this.baseUrl}${testPage.path}`, { 
              waitUntil: 'networkidle',
              timeout: 10000 
            });

            // Проверка горизонтальной прокрутки
            await this.checkHorizontalScroll(page, testPage, viewport);
            
            // Проверка элементов навигации
            if (viewport.width < 768) {
              await this.checkMobileNavigation(page, testPage, viewport);
            }
            
            // Проверка таблиц
            if (testPage.path !== '/' && testPage.path !== '/responsive-test') {
              await this.checkTableResponsiveness(page, testPage, viewport);
            }
            
            // Проверка форм
            await this.checkFormElements(page, testPage, viewport);

            // Специальные проверки для критично узких экранов (< 375px)
            if (viewport.width < 375) {
              await this.checkCriticalWidthIssues(page, testPage, viewport);
            }

          } catch (error) {
            this.issues.push({
              page: testPage.name,
              viewport: viewport.name,
              issue: `Ошибка загрузки страницы: ${error}`,
              severity: 'critical'
            });
          }
        }

        await context.close();
      }

      console.log(`✅ Тесты адаптивности завершены. Найдено ${this.issues.length} проблем.`);
    } finally {
      await browser.close();
    }
  }

  private async checkHorizontalScroll(page: Page, testPage: any, viewport: any): Promise<void> {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    if (bodyWidth > viewportWidth + 1) { // +1 для погрешности
      this.issues.push({
        page: testPage.name,
        viewport: viewport.name,
        issue: `Горизонтальная прокрутка: ширина контента ${bodyWidth}px > ширина экрана ${viewportWidth}px`,
        severity: viewport.critical ? 'critical' : 'warning'
      });
    }
  }

  private async checkMobileNavigation(page: Page, testPage: any, viewport: any): Promise<void> {
    const mobileMenuButton = page.locator('button[class*="md:hidden"]');
    
    if (!(await mobileMenuButton.isVisible())) {
      this.issues.push({
        page: testPage.name,
        viewport: viewport.name,
        issue: 'Отсутствует кнопка мобильного меню',
        severity: 'critical',
        element: 'navigation'
      });
    }
  }

  private async checkTableResponsiveness(page: Page, testPage: any, viewport: any): Promise<void> {
    const overflowContainer = page.locator('[class*="overflow-x-auto"]').first();
    
    if (!(await overflowContainer.isVisible())) {
      this.issues.push({
        page: testPage.name,
        viewport: viewport.name,
        issue: 'Таблица не имеет контейнера с overflow-x-auto',
        severity: 'critical',
        element: 'table'
      });
      return;
    }

    const table = overflowContainer.locator('table').first();
    if (!(await table.isVisible())) {
      this.issues.push({
        page: testPage.name,
        viewport: viewport.name,
        issue: 'Таблица не найдена внутри overflow контейнера',
        severity: 'warning',
        element: 'table'
      });
    }
  }

  private async checkFormElements(page: Page, testPage: any, viewport: any): Promise<void> {
    const inputs = await page.locator('input, select, textarea').all();
    
    for (let i = 0; i < inputs.length; i++) {
      const boundingBox = await inputs[i].boundingBox();
      if (boundingBox && boundingBox.x + boundingBox.width > viewport.width) {
        this.issues.push({
          page: testPage.name,
          viewport: viewport.name,
          issue: `Поле ввода ${i + 1} выходит за пределы экрана`,
          severity: 'warning',
          element: 'form'
        });
      }
    }
  }

  private async checkCriticalWidthIssues(page: Page, testPage: any, viewport: any): Promise<void> {
    // Проверяем текст, который может не поместиться
    const longTexts = await page.locator('text=/[А-Яа-я\\s]{50,}/').all();
    for (const textElement of longTexts) {
      const boundingBox = await textElement.boundingBox();
      if (boundingBox && boundingBox.width > viewport.width * 0.9) {
        this.issues.push({
          page: testPage.name,
          viewport: viewport.name,
          issue: 'Длинный текст может не поместиться на узком экране',
          severity: 'critical',
          element: 'text'
        });
      }
    }

    // Проверяем кнопки
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const boundingBox = await buttons[i].boundingBox();
      if (boundingBox && boundingBox.width > viewport.width * 0.8) {
        this.issues.push({
          page: testPage.name,
          viewport: viewport.name,
          issue: `Кнопка ${i + 1} слишком широкая для критично узкого экрана`,
          severity: 'critical',
          element: 'button'
        });
      }
    }
  }

  private generateReport(): string {
    let report = '\n';
    report += '========================================\n';
    report += '🔍 ОТЧЕТ О ТЕСТИРОВАНИИ АДАПТИВНОСТИ\n';
    report += '========================================\n\n';

    // Суммарная статистика
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const warningIssues = this.issues.filter(i => i.severity === 'warning').length;
    const stylelintErrors = this.stylelintIssues.filter(i => i.severity === 'error').length;
    const stylelintWarnings = this.stylelintIssues.filter(i => i.severity === 'warning').length;

    report += '📊 СВОДКА:\n';
    report += `   Критичные проблемы адаптивности: ${criticalIssues}\n`;
    report += `   Предупреждения адаптивности: ${warningIssues}\n`;
    report += `   Ошибки Stylelint: ${stylelintErrors}\n`;
    report += `   Предупреждения Stylelint: ${stylelintWarnings}\n`;
    report += `   Lighthouse категорий проверено: ${this.lighthouseIssues.length}\n\n`;

    // Критичные проблемы адаптивности
    if (criticalIssues > 0) {
      report += '🚨 КРИТИЧНЫЕ ПРОБЛЕМЫ АДАПТИВНОСТИ:\n';
      this.issues.filter(i => i.severity === 'critical').forEach((issue, index) => {
        report += `   ${index + 1}. [${issue.viewport}] ${issue.page}\n`;
        report += `      ${issue.issue}\n`;
        if (issue.element) report += `      Элемент: ${issue.element}\n`;
        report += '\n';
      });
    }

    // Проблемы при ширине < 375px
    const narrowIssues = this.issues.filter(i => 
      i.viewport.includes('360') || i.viewport.includes('Galaxy')
    );
    if (narrowIssues.length > 0) {
      report += '📱 ПРОБЛЕМЫ ПРИ ШИРИНЕ < 375px:\n';
      narrowIssues.forEach((issue, index) => {
        report += `   ${index + 1}. [${issue.viewport}] ${issue.page}\n`;
        report += `      ${issue.issue}\n`;
        if (issue.element) report += `      Элемент: ${issue.element}\n`;
        report += '\n';
      });
    }

    // Stylelint проблемы
    if (this.stylelintIssues.length > 0) {
      report += '🎨 STYLELINT ПРОБЛЕМЫ:\n';
      this.stylelintIssues.slice(0, 10).forEach((issue, index) => {
        report += `   ${index + 1}. ${path.basename(issue.file)}:${issue.line}:${issue.column}\n`;
        report += `      ${issue.text} (${issue.rule})\n\n`;
      });
      if (this.stylelintIssues.length > 10) {
        report += `   ... и еще ${this.stylelintIssues.length - 10} проблем\n\n`;
      }
    }

    // Lighthouse результаты
    if (this.lighthouseIssues.length > 0) {
      report += '🚨 LIGHTHOUSE АНАЛИЗ:\n';
      this.lighthouseIssues.forEach(category => {
        report += `   ${category.category.toUpperCase()}: ${category.score}/100\n`;
        if (category.issues.length > 0) {
          category.issues.slice(0, 3).forEach(issue => {
            report += `      - ${issue}\n`;
          });
        }
        report += '\n';
      });
    }

    // Рекомендации
    report += '💡 РЕКОМЕНДАЦИИ:\n';
    if (criticalIssues > 0) {
      report += '   1. Исправьте критичные проблемы адаптивности в первую очередь\n';
    }
    if (narrowIssues.length > 0) {
      report += '   2. Особое внимание уделите экранам шириной < 375px\n';
    }
    if (stylelintErrors > 0) {
      report += '   3. Запустите: npx stylelint "**/*.css" "**/*.tsx" --fix\n';
    }
    if (this.lighthouseIssues.some(i => i.score < 80)) {
      report += '   4. Проверьте производительность и доступность сайта\n';
    }
    
    report += '\n========================================\n';
    
    return report;
  }

  async run(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Запуск комплексного теста адаптивности...\n');

    // Параллельный запуск всех проверок
    await Promise.allSettled([
      this.runStylelintCheck(),
      this.runLighthouseCheck(),
      this.runResponsiveTests()
    ]);

    const report = this.generateReport();
    console.log(report);

    // Сохраняем отчет в файл
    const reportPath = `test_results_adaptive_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    await fs.writeFile(reportPath, report);
    console.log(`📄 Отчет сохранен в: ${reportPath}`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`⏱️ Время выполнения: ${duration.toFixed(1)}с`);

    // Возвращаем код выхода
    const hasErrors = this.issues.some(i => i.severity === 'critical') || 
                      this.stylelintIssues.some(i => i.severity === 'error');
    
    if (hasErrors) {
      console.log('\n❌ Тест завершен с ошибками');
      process.exit(1);
    } else {
      console.log('\n✅ Тест завершен успешно');
      process.exit(0);
    }
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  const test = new AdaptiveTest();
  test.run().catch(console.error);
}

export default AdaptiveTest;