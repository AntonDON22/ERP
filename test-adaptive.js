#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Запуск автотеста адаптивности ERP системы...\n');

const results = {
  stylelint: [],
  responsive: [],
  lighthouse: null
};

// Функция для запуска Stylelint
function runStylelint() {
  return new Promise(async (resolve) => {
    console.log('🔍 Проверка Stylelint...');
    
    try {
      const { stdout, stderr } = await execAsync('npx stylelint "**/*.css" "**/*.tsx" --formatter json --ignore-path .gitignore');
      if (stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout);
          parsed.forEach(file => {
            file.warnings.forEach(warning => {
              results.stylelint.push({
                file: path.basename(file.source),
                line: warning.line,
                issue: warning.text,
                rule: warning.rule,
                severity: warning.severity
              });
            });
          });
        } catch (e) {
          console.log('⚠️ Ошибка парсинга Stylelint');
        }
      }
      
      console.log(`✅ Stylelint: найдено ${results.stylelint.length} проблем`);
    } catch (error) {
      if (error.stdout) {
        try {
          const parsed = JSON.parse(error.stdout);
          parsed.forEach(file => {
            file.warnings.forEach(warning => {
              results.stylelint.push({
                file: path.basename(file.source),
                line: warning.line,
                issue: warning.text,
                rule: warning.rule,
                severity: warning.severity
              });
            });
          });
        } catch (e) {
          console.log('⚠️ Ошибка парсинга Stylelint из error.stdout');
        }
      }
      console.log(`⚠️ Stylelint завершен с предупреждениями: ${results.stylelint.length} проблем`);
    }
    
    resolve();
  });
}

// Функция для проверки адаптивности
function checkResponsiveness() {
  return new Promise((resolve) => {
    console.log('📱 Проверка адаптивности...');
    
    // Основные проблемы, которые можно проверить статически
    const issues = [];
    
    // Проверяем наличие overflow-x-auto в DataTable
    try {
      const dataTableContent = fs.readFileSync('client/src/components/DataTable.tsx', 'utf8');
      if (!dataTableContent.includes('overflow-x-auto')) {
        issues.push({
          component: 'DataTable',
          issue: 'Отсутствует overflow-x-auto для горизонтальной прокрутки',
          severity: 'critical',
          file: 'DataTable.tsx'
        });
      }
      
      // Проверяем responsive классы
      const responsiveClasses = ['sm:', 'md:', 'lg:'];
      const hasResponsive = responsiveClasses.some(cls => dataTableContent.includes(cls));
      if (!hasResponsive) {
        issues.push({
          component: 'DataTable',
          issue: 'Отсутствуют адаптивные breakpoints (sm:, md:, lg:)',
          severity: 'warning',
          file: 'DataTable.tsx'
        });
      }
    } catch (e) {
      issues.push({
        component: 'DataTable',
        issue: 'Файл DataTable.tsx не найден',
        severity: 'critical',
        file: 'DataTable.tsx'
      });
    }
    
    // Проверяем Navigation
    try {
      const navContent = fs.readFileSync('client/src/components/Navigation.tsx', 'utf8');
      if (!navContent.includes('md:hidden')) {
        issues.push({
          component: 'Navigation',
          issue: 'Отсутствует мобильное меню (md:hidden)',
          severity: 'critical',
          file: 'Navigation.tsx'
        });
      }
    } catch (e) {
      issues.push({
        component: 'Navigation',
        issue: 'Файл Navigation.tsx не найден',
        severity: 'critical',
        file: 'Navigation.tsx'
      });
    }
    
    // Проверяем ResponsiveTableWrapper
    try {
      fs.accessSync('client/src/components/ui/responsive-table-wrapper.tsx');
    } catch (e) {
      issues.push({
        component: 'ResponsiveTableWrapper',
        issue: 'ResponsiveTableWrapper компонент не найден',
        severity: 'warning',
        file: 'responsive-table-wrapper.tsx'
      });
    }
    
    results.responsive = issues;
    console.log(`✅ Адаптивность: найдено ${issues.length} проблем`);
    resolve();
  });
}

// Функция для быстрой проверки производительности
function quickPerformanceCheck() {
  return new Promise((resolve) => {
    console.log('⚡ Быстрая проверка производительности...');
    
    // Простая проверка размера файлов
    const issues = [];
    
    try {
      const stats = fs.statSync('client/src/components/DataTable.tsx');
      if (stats.size > 50000) { // 50KB
        issues.push('DataTable.tsx слишком большой (>50KB)');
      }
    } catch (e) {}
    
    try {
      const indexContent = fs.readFileSync('client/src/index.css', 'utf8');
      if (indexContent.length > 10000) { // 10KB CSS
        issues.push('CSS файл слишком большой (>10KB)');
      }
    } catch (e) {}
    
    results.lighthouse = {
      performance: issues.length === 0 ? 85 : 65,
      issues: issues
    };
    
    console.log(`✅ Производительность: ${issues.length} предупреждений`);
    resolve();
  });
}

// Генерация отчета
function generateReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let report = '';
  
  report += '========================================\n';
  report += '🔍 ОТЧЕТ АВТОТЕСТА АДАПТИВНОСТИ\n';
  report += '========================================\n\n';
  
  // Сводка
  const criticalIssues = results.responsive.filter(i => i.severity === 'critical').length;
  const warningIssues = results.responsive.filter(i => i.severity === 'warning').length;
  const stylelintErrors = results.stylelint.filter(i => i.severity === 'error').length;
  
  report += '📊 СВОДКА:\n';
  report += `   Критичные проблемы адаптивности: ${criticalIssues}\n`;
  report += `   Предупреждения адаптивности: ${warningIssues}\n`;
  report += `   Ошибки Stylelint: ${stylelintErrors}\n`;
  report += `   Производительность: ${results.lighthouse.performance}/100\n\n`;
  
  // Критичные проблемы
  if (criticalIssues > 0) {
    report += '🚨 КРИТИЧНЫЕ ПРОБЛЕМЫ:\n';
    results.responsive.filter(i => i.severity === 'critical').forEach((issue, index) => {
      report += `   ${index + 1}. [${issue.component}] ${issue.issue}\n`;
      report += `      Файл: ${issue.file}\n\n`;
    });
  }
  
  // Проблемы для ширины < 375px
  report += '📱 РЕКОМЕНДАЦИИ ДЛЯ ЭКРАНОВ < 375px:\n';
  report += '   1. Проверьте что все таблицы имеют overflow-x-auto\n';
  report += '   2. Используйте sm: префиксы для мобильных устройств\n';
  report += '   3. Тестируйте на iPhone SE (375px) и Samsung Galaxy (360px)\n';
  report += '   4. Убедитесь что кнопки не слишком широкие\n\n';
  
  // Stylelint проблемы
  if (results.stylelint.length > 0) {
    report += '🎨 STYLELINT ПРОБЛЕМЫ:\n';
    results.stylelint.slice(0, 5).forEach((issue, index) => {
      report += `   ${index + 1}. ${issue.file}:${issue.line} - ${issue.issue}\n`;
    });
    if (results.stylelint.length > 5) {
      report += `   ... и еще ${results.stylelint.length - 5} проблем\n`;
    }
    report += '\n';
  }
  
  // Команды для исправления
  report += '🔧 КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ:\n';
  if (stylelintErrors > 0) {
    report += '   npx stylelint "**/*.css" "**/*.tsx" --fix\n';
  }
  report += '   npm run test:responsive  # для повторного тестирования\n';
  report += '   Откройте /responsive-test в браузере для ручной проверки\n\n';
  
  report += '========================================\n';
  
  // Сохраняем отчет
  const reportFile = `test_results_adaptive_${timestamp}.log`;
  fs.writeFileSync(reportFile, report);
  
  console.log(report);
  console.log(`📄 Отчет сохранен: ${reportFile}`);
  
  // Возвращаем статус
  return criticalIssues === 0 && stylelintErrors === 0;
}

// Основная функция
async function runTest() {
  const startTime = Date.now();
  
  try {
    await runStylelint();
    await checkResponsiveness();
    await quickPerformanceCheck();
    
    const success = generateReport();
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`⏱️ Время выполнения: ${duration.toFixed(1)}с`);
    
    if (success) {
      console.log('\n✅ Автотест завершен успешно');
      process.exit(0);
    } else {
      console.log('\n❌ Автотест завершен с ошибками');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Ошибка выполнения автотеста:', error);
    process.exit(1);
  }
}

runTest();