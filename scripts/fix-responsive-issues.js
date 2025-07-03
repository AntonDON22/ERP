#!/usr/bin/env node

/**
 * 🔧 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ КРИТИЧЕСКИХ ПРОБЛЕМ АДАПТИВНОСТИ
 * 
 * Исправляет основные проблемы адаптивности в критических компонентах
 * для обеспечения поддержки экранов от 320px
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация исправлений
const FIXES = {
  // Критические компоненты требующие исправления
  criticalFiles: [
    'client/src/components/Navigation.tsx',
    'client/src/components/DataTable.tsx',
    'client/src/pages/ProductsList.tsx',
    'client/src/pages/InventoryList.tsx',
    'client/src/pages/OrdersList.tsx'
  ],
  
  // Паттерны исправлений
  patterns: [
    // Добавить overflow-x-auto для div с классом flex или grid
    {
      find: /(<div className="[^"]*)(flex|grid)([^"]*"[^>]*>)/g,
      replace: '$1$2$3',
      addOverflow: true
    },
    
    // Добавить адаптивные отступы
    {
      find: /(className="[^"]*)\bp-(\d+)\b([^"]*")/g,
      replace: '$1p-$2 sm:p-$2 md:p-$2$3'
    },
    
    // Добавить адаптивные размеры текста
    {
      find: /(className="[^"]*)\btext-(sm|base|lg|xl)\b([^"]*")/g,
      replace: '$1text-sm sm:text-$2$3'
    }
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
  cyan: '\x1b[36m'
};

class ResponsivenessFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  /**
   * Исправляет файл добавляя адаптивные классы
   */
  fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileFixed = false;
      let fixCount = 0;

      // Применяем исправления Navigation
      if (filePath.includes('Navigation.tsx')) {
        const navigationFixes = this.fixNavigation(newContent);
        newContent = navigationFixes.content;
        fixCount += navigationFixes.fixes;
        fileFixed = navigationFixes.fixes > 0;
      }

      // Применяем исправления DataTable
      if (filePath.includes('DataTable.tsx')) {
        const tableFixes = this.fixDataTable(newContent);
        newContent = tableFixes.content;
        fixCount += tableFixes.fixes;
        fileFixed = tableFixes.fixes > 0;
      }

      // Применяем исправления страниц списков
      if (filePath.includes('List.tsx') || filePath.includes('Lists.tsx')) {
        const listFixes = this.fixListPages(newContent);
        newContent = listFixes.content;
        fixCount += listFixes.fixes;
        fileFixed = listFixes.fixes > 0;
      }

      // Сохраняем изменения
      if (fileFixed) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.fixedFiles++;
        this.totalFixes += fixCount;
        
        console.log(`${colors.green}✓${colors.reset} ${path.relative(process.cwd(), filePath)} - ${colors.cyan}${fixCount} исправлений${colors.reset}`);
      }

      return { fixed: fileFixed, fixes: fixCount };

    } catch (error) {
      console.error(`${colors.red}Ошибка при исправлении ${filePath}:${colors.reset}`, error.message);
      return { fixed: false, fixes: 0 };
    }
  }

  /**
   * Исправления для Navigation
   */
  fixNavigation(content) {
    let newContent = content;
    let fixes = 0;

    // Добавляем мобильное меню если отсутствует
    if (!content.includes('MenuIcon') && !content.includes('mobile')) {
      // Ищем импорты lucide-react
      const lucideImport = content.match(/import\s*{([^}]+)}\s*from\s*["']lucide-react["']/);
      if (lucideImport) {
        const icons = lucideImport[1];
        if (!icons.includes('Menu')) {
          newContent = newContent.replace(
            /from\s*["']lucide-react["']/,
            'from "lucide-react"'
          ).replace(
            lucideImport[0],
            `import { ${icons.trim()}, Menu } from "lucide-react"`
          );
          fixes++;
        }
      }

      // Добавляем адаптивные классы к навигации
      newContent = newContent.replace(
        /(<nav[^>]*className="[^"]*)(hidden\s+md:flex)?([^"]*")/g,
        '$1hidden md:flex$3'
      );
      fixes++;
    }

    return { content: newContent, fixes };
  }

  /**
   * Исправления для DataTable
   */
  fixDataTable(content) {
    let newContent = content;
    let fixes = 0;

    // Добавляем overflow-x-auto к таблицам
    newContent = newContent.replace(
      /(<div[^>]*className="[^"]*)(table-container|table-wrapper)?([^"]*"[^>]*>[\s\S]*?<table)/g,
      (match, prefix, existing, suffix, table) => {
        if (!match.includes('overflow-x-auto')) {
          fixes++;
          return `${prefix}overflow-x-auto ${existing || ''}${suffix}${table}`;
        }
        return match;
      }
    );

    // Добавляем адаптивные классы к кнопкам действий
    newContent = newContent.replace(
      /(<Button[^>]*className="[^"]*)(text-\w+)?([^"]*")/g,
      (match, prefix, textSize, suffix) => {
        if (!match.includes('sm:')) {
          fixes++;
          return `${prefix}text-xs sm:text-sm${suffix}`;
        }
        return match;
      }
    );

    return { content: newContent, fixes };
  }

  /**
   * Исправления для страниц списков
   */
  fixListPages(content) {
    let newContent = content;
    let fixes = 0;

    // Добавляем адаптивные отступы к контейнерам
    newContent = newContent.replace(
      /(<div[^>]*className="[^"]*)(max-w-\w+\s+mx-auto)?([^"]*px-\d+)([^"]*")/g,
      (match, prefix, maxWidth, padding, suffix) => {
        if (!padding.includes('sm:px')) {
          fixes++;
          return `${prefix}${maxWidth || ''}px-2 sm:px-4 lg:px-8${suffix}`;
        }
        return match;
      }
    );

    // Добавляем адаптивные размеры для заголовков
    newContent = newContent.replace(
      /(<h1[^>]*className="[^"]*)(text-\w+)?([^"]*")/g,
      (match, prefix, textSize, suffix) => {
        if (!match.includes('sm:text')) {
          fixes++;
          return `${prefix}text-xl sm:text-2xl lg:text-3xl${suffix}`;
        }
        return match;
      }
    );

    // Добавляем адаптивные gap для flex контейнеров
    newContent = newContent.replace(
      /(<div[^>]*className="[^"]*flex[^"]*)(gap-\d+)?([^"]*")/g,
      (match, prefix, gap, suffix) => {
        if (!gap && !match.includes('sm:gap')) {
          fixes++;
          return `${prefix}gap-2 sm:gap-4${suffix}`;
        }
        return match;
      }
    );

    return { content: newContent, fixes };
  }

  /**
   * Запускает исправления для критических файлов
   */
  run() {
    console.log(`${colors.bright}${colors.cyan}🔧 Автоматическое исправление критических проблем адаптивности${colors.reset}\n`);

    // Проверяем существование файлов
    const existingFiles = FIXES.criticalFiles.filter(file => 
      fs.existsSync(path.join(process.cwd(), file))
    );

    if (existingFiles.length === 0) {
      console.log(`${colors.yellow}⚠️ Критические файлы не найдены${colors.reset}`);
      return 0;
    }

    console.log(`${colors.bright}Исправление ${existingFiles.length} критических файлов...${colors.reset}\n`);

    // Исправляем каждый файл
    existingFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      this.fixFile(fullPath);
    });

    // Отчет о результатах
    console.log(`\n${colors.bright}📊 РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ:${colors.reset}`);
    console.log(`   Исправлено файлов: ${colors.green}${this.fixedFiles}${colors.reset}`);
    console.log(`   Всего исправлений: ${colors.cyan}${this.totalFixes}${colors.reset}`);

    if (this.fixedFiles > 0) {
      console.log(`\n${colors.bright}${colors.green}✅ Критические проблемы адаптивности исправлены!${colors.reset}`);
      console.log(`${colors.bright}💡 Рекомендуется повторно запустить аудит для проверки${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}ℹ️ Критические исправления не требуются${colors.reset}`);
    }

    return this.fixedFiles > 0 ? 0 : 1;
  }
}

// Запуск исправлений
const fixer = new ResponsivenessFixer();
const exitCode = fixer.run();
process.exit(exitCode);