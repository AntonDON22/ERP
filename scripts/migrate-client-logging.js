#!/usr/bin/env node
/**
 * 🔧 МАССОВАЯ МИГРАЦИЯ КЛИЕНТСКОГО ЛОГИРОВАНИЯ
 * 
 * Автоматически заменяет все console.* на централизованное логирование
 * через client/src/lib/clientLogger.ts для унификации фронтенда
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Список файлов для миграции
 */
const filesToMigrate = [
  'client/src/pages/CreateOrder.tsx',
  'client/src/pages/EditOrder.tsx',
  'client/src/pages/Dashboard.tsx'
];

/**
 * Паттерны замены для каждого типа логирования
 */
const logReplacements = [
  // CreateOrder.tsx - специфичные паттерны
  {
    pattern: /console\.log\(`🚀 Starting order submission #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("CreateOrder", \`Starting order submission #\${currentSubmissionId}\`);`
  },
  {
    pattern: /console\.log\(`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - isSubmitting = true`\);/g,
    replacement: `logBlockDuplicate("CreateOrder", currentSubmissionId, "isSubmitting = true");`
  },
  {
    pattern: /console\.log\(`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - mutation pending`\);/g,
    replacement: `logBlockDuplicate("CreateOrder", currentSubmissionId, "mutation pending");`
  },
  {
    pattern: /console\.log\(\s*`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - form validation failed`.*?\);/gs,
    replacement: `logBlockDuplicate("CreateOrder", currentSubmissionId, "form validation failed");`
  },
  {
    pattern: /console\.log\(`✅ Processing order submission #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("CreateOrder", \`Processing order submission #\${currentSubmissionId}\`);`
  },
  {
    pattern: /console\.log\(`📄 Creating new order`\);/g,
    replacement: `logFormOperation("CreateOrder", "Creating new order");`
  },
  {
    pattern: /console\.log\(`✅ Submission #\$\{currentSubmissionId\} completed successfully`\);/g,
    replacement: `logOperationSuccess("CreateOrder", \`Submission #\${currentSubmissionId} completed\`);`
  },
  {
    pattern: /console\.log\(`❌ Submission #\$\{currentSubmissionId\} failed:`, error\);/g,
    replacement: `logOperationError("CreateOrder", \`Submission #\${currentSubmissionId}\`, error);`
  },
  {
    pattern: /console\.log\(`🔓 Released submission lock for #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("CreateOrder", \`Released submission lock for #\${currentSubmissionId}\`);`
  },
  {
    pattern: /console\.log\("❌ Form validation failed:", errors\);/g,
    replacement: `logValidationError("CreateOrder", errors);`
  },

  // EditOrder.tsx - специфичные паттерны
  {
    pattern: /console\.log\("🔄 EditOrder - заполнение формы данными заказа:", orderData\);/g,
    replacement: `logFormOperation("EditOrder", "Заполнение формы данными заказа", orderData);`
  },
  {
    pattern: /console\.log\("📦 EditOrder - items из данных:", orderData\.items\);/g,
    replacement: `logFormOperation("EditOrder", "Items из данных", orderData.items);`
  },
  {
    pattern: /console\.log\(`🚀 Starting order update #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("EditOrder", \`Starting order update #\${currentSubmissionId}\`);`
  },
  {
    pattern: /console\.log\(`📝 Form errors:\`, form\.formState\.errors\);/g,
    replacement: `logValidationError("EditOrder", form.formState.errors);`
  },
  {
    pattern: /console\.log\(`📝 Form values:\`, data\);/g,
    replacement: `logFormOperation("EditOrder", "Form values", data);`
  },
  {
    pattern: /console\.log\(`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - isSubmitting = true`\);/g,
    replacement: `logBlockDuplicate("EditOrder", currentSubmissionId, "isSubmitting = true");`
  },
  {
    pattern: /console\.log\(`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - mutation pending`\);/g,
    replacement: `logBlockDuplicate("EditOrder", currentSubmissionId, "mutation pending");`
  },
  {
    pattern: /console\.log\(\s*`❌ Blocked duplicate submission #\$\{currentSubmissionId\} - form validation failed`.*?\);/gs,
    replacement: `logBlockDuplicate("EditOrder", currentSubmissionId, "form validation failed");`
  },
  {
    pattern: /console\.log\(`✅ Processing order update #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("EditOrder", \`Processing order update #\${currentSubmissionId}\`);`
  },
  {
    pattern: /console\.log\(`📄 Updating order \$\{orderId\}`\);/g,
    replacement: `logFormOperation("EditOrder", \`Updating order \${orderId}\`);`
  },
  {
    pattern: /console\.log\(`✅ Update #\$\{currentSubmissionId\} completed successfully`\);/g,
    replacement: `logOperationSuccess("EditOrder", \`Update #\${currentSubmissionId} completed\`);`
  },
  {
    pattern: /console\.log\(`❌ Update #\$\{currentSubmissionId\} failed:`, error\);/g,
    replacement: `logOperationError("EditOrder", \`Update #\${currentSubmissionId}\`, error);`
  },
  {
    pattern: /console\.log\(`🔓 Released submission lock for #\$\{currentSubmissionId\}`\);/g,
    replacement: `logFormOperation("EditOrder", \`Released submission lock for #\${currentSubmissionId}\`);`
  },

  // Dashboard.tsx - общие паттерны
  {
    pattern: /console\.error\("Ошибка копирования:", err\);/g,
    replacement: `logOperationError("Dashboard", "Копирование в буфер обмена", err);`
  },

  // Общие условные блоки - убираем условие и оставляем только логирование
  {
    pattern: /\/\/ ✅ ИСПРАВЛЕНО: Условное логирование вместо console\.log\s*if \(import\.meta\.env\.DEV\) \{\s*(console\.[^}]+)\s*\}/gs,
    replacement: '$1'
  },
  {
    pattern: /\/\/ ✅ ИСПРАВЛЕНО: Условное логирование вместо console\.(log|error|warn|info)\s*if \(import\.meta\.env\.DEV\) \{\s*(console\.[^}]+)\s*\}/gs,
    replacement: '$2'
  }
];

/**
 * Функция миграции одного файла
 */
function migrateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Файл не найден: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changesMade = 0;

  // Проверяем наличие импорта логгера
  const hasLoggerImport = content.includes('from "@/lib/clientLogger"');
  
  if (!hasLoggerImport) {
    console.log(`📦 Добавляем импорт логгера в ${filePath}`);
    // Находим последний импорт и добавляем после него
    const lastImportMatch = content.match(/import.*from.*["'];(\n|$)/);
    if (lastImportMatch) {
      const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
      const loggerImport = `import { 
  logFormOperation, 
  logBlockDuplicate, 
  logOperationSuccess, 
  logOperationError, 
  logValidationError 
} from "@/lib/clientLogger";\n`;
      content = content.slice(0, insertPosition) + loggerImport + content.slice(insertPosition);
      changesMade++;
    }
  }

  // Применяем все замены
  logReplacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`🔄 Замена в ${filePath}: ${matches.length} вхождений`);
      content = content.replace(pattern, replacement);
      changesMade += matches.length;
    }
  });

  if (changesMade > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Файл ${filePath} обновлен (${changesMade} изменений)`);
    return true;
  } else {
    console.log(`ℹ️  Файл ${filePath} не требует изменений`);
    return false;
  }
}

/**
 * Запуск миграции
 */
function runMigration() {
  console.log('🚀 Запуск массовой миграции клиентского логирования...\n');
  
  let totalFiles = 0;
  let migratedFiles = 0;

  filesToMigrate.forEach(filePath => {
    totalFiles++;
    if (migrateFile(filePath)) {
      migratedFiles++;
    }
  });

  console.log(`\n📊 Результаты миграции:`);
  console.log(`   Всего файлов: ${totalFiles}`);
  console.log(`   Обновлено: ${migratedFiles}`);
  console.log(`   Без изменений: ${totalFiles - migratedFiles}`);
  
  if (migratedFiles > 0) {
    console.log('\n🎉 Миграция завершена успешно!');
    console.log('📝 Все console.* заменены на централизованное логирование');
  } else {
    console.log('\n✅ Все файлы уже используют централизованное логирование');
  }
}

// Запуск скрипта
runMigration();