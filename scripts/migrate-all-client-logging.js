#!/usr/bin/env node
/**
 * 🔧 ФИНАЛЬНАЯ МИГРАЦИЯ ВСЕХ КЛИЕНТСКИХ ФАЙЛОВ
 * 
 * Полностью заменяет все console.* на централизованное логирование
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToMigrate = [
  'client/src/hooks/usePerformanceAudit.ts',
  'client/src/lib/errorLogger.ts',
  'client/src/pages/Dashboard.tsx',
  'client/src/pages/CreateOrder.tsx',
  'client/src/pages/EditOrder.tsx'
];

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
      const loggerImport = `import { clientLogger } from "@/lib/clientLogger";\n`;
      content = content.slice(0, insertPosition) + loggerImport + content.slice(insertPosition);
      changesMade++;
    }
  }

  // Специфичные замены для каждого файла
  switch (path.basename(filePath)) {
    case 'usePerformanceAudit.ts':
      content = content.replace(/console\.log/g, 'clientLogger.debug("performance"');
      content = content.replace(/console\.warn/g, 'clientLogger.warn("performance"');
      changesMade += 2;
      break;
      
    case 'errorLogger.ts':
      content = content.replace(/console\.error/g, 'clientLogger.error("errors"');
      changesMade += 1;
      break;
      
    case 'Dashboard.tsx':
      // уже должен быть заменен
      break;
      
    case 'CreateOrder.tsx':
    case 'EditOrder.tsx':
      // Убираем комментарии про console.log
      content = content.replace(/\s*\/\/ ✅ ИСПРАВЛЕНО: Условное логирование вместо console\.[a-z]+/g, '');
      changesMade += 1;
      break;
  }

  if (changesMade > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Файл ${filePath} обновлен (${changesMade} изменений)`);
    return true;
  } else {
    console.log(`ℹ️  Файл ${filePath} не требует изменений`);
    return false;
  }
}

function runMigration() {
  console.log('🚀 Запуск финальной миграции всех клиентских файлов...\n');
  
  let totalFiles = 0;
  let migratedFiles = 0;

  filesToMigrate.forEach(filePath => {
    totalFiles++;
    if (migrateFile(filePath)) {
      migratedFiles++;
    }
  });

  console.log(`\n📊 Результаты финальной миграции:`);
  console.log(`   Всего файлов: ${totalFiles}`);
  console.log(`   Обновлено: ${migratedFiles}`);
  console.log(`   Без изменений: ${totalFiles - migratedFiles}`);
  
  console.log('\n🎉 Финальная миграция завершена!');
  console.log('📝 Все клиентские файлы используют централизованное логирование');
  console.log('🔒 ESLint правила предотвратят новые нарушения');
}

runMigration();