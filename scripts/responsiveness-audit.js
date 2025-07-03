#!/usr/bin/env node

/**
 * 🔍 АВТОМАТИЧЕСКИЙ АУДИТ АДАПТИВНОСТИ ИНТЕРФЕЙСА
 * 
 * Проверяет все React компоненты на наличие адаптивных классов
 * и соответствие стандартам mobile-first дизайна
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация адаптивности
const CONFIG = {
  breakpoints: {
    mobile: '320px',
    tablet: '768px', 
    desktop: '1024px'
  },
  requiredClasses: [
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'max-w-', 'w-full', 'overflow-x-auto',
    'px-', 'py-', 'gap-', 'space-'
  ],
  criticalComponents: [
    'DataTable', 'Navigation', 'Dashboard',
    'ProductsList', 'CreateOrder', 'EditOrder'
  ]
};

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ResponsivenessAuditor {
  constructor() {
    this.issues = [];
    this.scanned = 0;
    this.responsive = 0;
  }

  /**
   * Сканирует файл на наличие адаптивных классов
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      this.scanned++;
      
      // Проверка на адаптивные классы
      const hasResponsiveClasses = this.checkResponsiveClasses(content);
      const hasOverflowProtection = this.checkOverflowProtection(content);
      const hasProperSpacing = this.checkProperSpacing(content);
      
      if (hasResponsiveClasses) {
        this.responsive++;
      }
      
      // Анализ проблем
      const issues = [];
      
      if (!hasResponsiveClasses) {
        issues.push('Отсутствуют адаптивные классы (sm:, md:, lg:)');
      }
      
      if (!hasOverflowProtection) {
        issues.push('Отсутствует защита от переполнения (overflow-x-auto)');
      }
      
      if (!hasProperSpacing) {
        issues.push('Нет адаптивных отступов (px-, py-, gap-)');
      }
      
      // Специальные проверки для критических компонентов
      if (this.isCriticalComponent(relativePath)) {
        const criticalIssues = this.checkCriticalComponent(content, relativePath);
        issues.push(...criticalIssues);
      }
      
      if (issues.length > 0) {
        this.issues.push({
          file: relativePath,
          issues
        });
      }
      
      return {
        responsive: hasResponsiveClasses,
        issues: issues.length
      };
      
    } catch (error) {
      console.error(`${colors.red}Ошибка при сканировании ${filePath}:${colors.reset}`, error.message);
      return { responsive: false, issues: 1 };
    }
  }

  /**
   * Проверяет наличие адаптивных классов
   */
  checkResponsiveClasses(content) {
    const responsivePatterns = [
      /\b(sm|md|lg|xl|2xl):/g,
      /\bmax-w-\w+/g,
      /\bw-full/g
    ];
    
    return responsivePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Проверяет защиту от переполнения
   */
  checkOverflowProtection(content) {
    const overflowPatterns = [
      /\boverflow-x-auto/g,
      /\boverflow-hidden/g,
      /\bscroll-smooth/g
    ];
    
    return overflowPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Проверяет адаптивные отступы
   */
  checkProperSpacing(content) {
    const spacingPatterns = [
      /\b(px|py|gap|space)-(2|4|6|8)/g,
      /\b(sm|md|lg):(px|py|gap|space)-\d+/g
    ];
    
    return spacingPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Проверяет критические компоненты
   */
  isCriticalComponent(filePath) {
    return CONFIG.criticalComponents.some(component => 
      filePath.includes(component)
    );
  }

  /**
   * Специальные проверки для критических компонентов
   */
  checkCriticalComponent(content, filePath) {
    const issues = [];
    
    // DataTable должен иметь ResponsiveTableWrapper
    if (filePath.includes('DataTable')) {
      if (!content.includes('ResponsiveTableWrapper')) {
        issues.push('DataTable должен использовать ResponsiveTableWrapper');
      }
    }
    
    // Navigation должен иметь мобильное меню
    if (filePath.includes('Navigation')) {
      if (!content.includes('MenuIcon') && !content.includes('mobile')) {
        issues.push('Navigation должен иметь мобильное меню');
      }
    }
    
    // Формы должны быть адаптивными
    if (content.includes('useForm') || content.includes('Form')) {
      if (!content.includes('grid-cols-1') && !content.includes('sm:grid-cols-2')) {
        issues.push('Формы должны иметь адаптивную сетку');
      }
    }
    
    return issues;
  }

  /**
   * Сканирует директорию рекурсивно
   */
  scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Пропускаем node_modules и другие системные папки
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          this.scanDirectory(fullPath);
        }
      } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        this.scanFile(fullPath);
      }
    });
  }

  /**
   * Генерирует отчет об адаптивности
   */
  generateReport() {
    console.log(`${colors.bright}${colors.cyan}=== АУДИТ АДАПТИВНОСТИ ИНТЕРФЕЙСА ===${colors.reset}\n`);
    
    // Общая статистика
    const responsivePercent = Math.round((this.responsive / this.scanned) * 100);
    
    console.log(`${colors.bright}📊 ОБЩАЯ СТАТИСТИКА:${colors.reset}`);
    console.log(`   Проверено файлов: ${colors.bright}${this.scanned}${colors.reset}`);
    console.log(`   Адаптивных: ${colors.green}${this.responsive}${colors.reset}`);
    console.log(`   Процент адаптивности: ${responsivePercent >= 80 ? colors.green : colors.yellow}${responsivePercent}%${colors.reset}`);
    console.log(`   Проблем найдено: ${this.issues.length > 0 ? colors.red : colors.green}${this.issues.length}${colors.reset}\n`);
    
    // Детальный отчет по проблемам
    if (this.issues.length > 0) {
      console.log(`${colors.bright}${colors.red}🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:${colors.reset}\n`);
      
      this.issues.forEach((item, index) => {
        console.log(`${colors.bright}${index + 1}. ${colors.yellow}${item.file}${colors.reset}`);
        item.issues.forEach(issue => {
          console.log(`   ${colors.red}▶${colors.reset} ${issue}`);
        });
        console.log('');
      });
    } else {
      console.log(`${colors.bright}${colors.green}✅ ПРОБЛЕМ НЕ НАЙДЕНО!${colors.reset}\n`);
    }
    
    // Рекомендации
    console.log(`${colors.bright}${colors.blue}💡 РЕКОМЕНДАЦИИ:${colors.reset}`);
    console.log(`   • Используйте адаптивные классы: ${colors.cyan}sm:, md:, lg:${colors.reset}`);
    console.log(`   • Добавляйте ${colors.cyan}overflow-x-auto${colors.reset} для таблиц`);
    console.log(`   • Применяйте ${colors.cyan}max-w-${colors.reset} для контейнеров`);
    console.log(`   • Используйте ${colors.cyan}ResponsiveTableWrapper${colors.reset} для таблиц`);
    console.log(`   • Тестируйте на экранах от ${colors.cyan}320px${colors.reset}\n`);
    
    // Итоговая оценка
    if (responsivePercent >= 90) {
      console.log(`${colors.bright}${colors.green}🎉 ОТЛИЧНАЯ АДАПТИВНОСТЬ!${colors.reset}`);
    } else if (responsivePercent >= 70) {
      console.log(`${colors.bright}${colors.yellow}⚠️  ХОРОШАЯ АДАПТИВНОСТЬ, НО ЕСТЬ МЕСТО ДЛЯ УЛУЧШЕНИЙ${colors.reset}`);
    } else {
      console.log(`${colors.bright}${colors.red}🚨 ТРЕБУЕТСЯ РАБОТА НАД АДАПТИВНОСТЬЮ${colors.reset}`);
    }
  }

  /**
   * Запускает полный аудит
   */
  run() {
    const clientDir = path.join(process.cwd(), 'client', 'src');
    
    if (!fs.existsSync(clientDir)) {
      console.error(`${colors.red}Директория client/src не найдена${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.bright}Запуск аудита адаптивности...${colors.reset}\n`);
    
    this.scanDirectory(clientDir);
    this.generateReport();
    
    // Возвращаем код выхода
    return this.issues.length === 0 ? 0 : 1;
  }
}

// Запуск аудита
const auditor = new ResponsivenessAuditor();
const exitCode = auditor.run();
process.exit(exitCode);