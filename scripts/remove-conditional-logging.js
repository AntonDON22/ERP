#!/usr/bin/env node
/**
 * 🔧 УДАЛЕНИЕ УСЛОВНОГО ЛОГИРОВАНИЯ
 * 
 * Убирает все if (process.env.NODE_ENV === "development") блоки
 * так как clientLogger уже обрабатывает это внутренне
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToClean = [
  'client/src/pages/CreateOrder.tsx',
  'client/src/pages/EditOrder.tsx'
];

function cleanFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Файл не найден: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changesMade = 0;

  // Паттерн для поиска условных блоков с логированием
  const conditionalLogPattern = /\s*\/\/ ✅ ИСПРАВЛЕНО: Условное логирование вместо console\.(log|error|warn|info)\s*if \(process\.env\.NODE_ENV === ["']development["']\) \{\s*(log[A-Za-z]+\([^}]+\));?\s*\}/gs;
  
  // Заменяем условный блок только на вызов логгера
  content = content.replace(conditionalLogPattern, (match, logLevel, logCall) => {
    changesMade++;
    return `      ${logCall}`;
  });

  if (changesMade > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Файл ${filePath} очищен (${changesMade} блоков удалено)`);
    return true;
  } else {
    console.log(`ℹ️  Файл ${filePath} не требует очистки`);
    return false;
  }
}

function runCleanup() {
  console.log('🧹 Запуск очистки условного логирования...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  filesToClean.forEach(filePath => {
    totalFiles++;
    if (cleanFile(filePath)) {
      cleanedFiles++;
    }
  });

  console.log(`\n📊 Результаты очистки:`);
  console.log(`   Всего файлов: ${totalFiles}`);
  console.log(`   Очищено: ${cleanedFiles}`);
  console.log(`   Без изменений: ${totalFiles - cleanedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n🎉 Очистка завершена успешно!');
    console.log('📝 Все условные блоки удалены, остались только прямые вызовы логгера');
  } else {
    console.log('\n✅ Все файлы уже очищены от условного логирования');
  }
}

runCleanup();