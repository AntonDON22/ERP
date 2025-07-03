#!/usr/bin/env node
/**
 * 🔧 МАССОВАЯ МИГРАЦИЯ ЛОГИРОВАНИЯ В storage.ts
 * 
 * Автоматически заменяет все console.log на структурированное логирование
 * через shared/logger.ts для унификации всей системы логирования
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к файлу storage.ts
const storageFilePath = path.join(__dirname, '..', 'server', 'storage.ts');

// Паттерны для замены console.log
const logReplacements = [
  // Удаляем старые логи документов
  {
    pattern: /console\.log\(`📝 Документ \$\{id\} переведен в черновик, движения инвентаря отменены`\);/g,
    replacement: `dbLogger.info("Document status changed", {
      operation: "updateDocument",
      module: "storage",
      documentId: id,
      oldStatus: "draft",
      newStatus: "posted",
      message: "Документ переведен в черновик, движения инвентаря отменены"
    });`
  },
  {
    pattern: /console\.log\(`✅ Документ \$\{id\} проведен, движения инвентаря созданы`\);/g,
    replacement: `dbLogger.info("Document status changed", {
      operation: "updateDocument",
      module: "storage",
      documentId: id,
      oldStatus: "draft",
      newStatus: "posted",
      message: "Документ проведен, движения инвентаря созданы"
    });`
  },
  {
    pattern: /console\.error\("Error updating document:", error\);/g,
    replacement: `dbLogger.error("Error updating document", {
      operation: "updateDocument",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  // Документы deleteDocument
  {
    pattern: /console\.log\(`\[DB\] Starting deleteDocument for ID \$\{id\}\.\.\.`\);/g,
    replacement: ``
  },
  {
    pattern: /console\.log\(\s*`\[DB\] Deleted \$\{itemsResult\.rowCount \?\? 0\} document items for document \$\{id\}`\s*\);/g,
    replacement: `dbLogger.debug("Document items deleted", {
      operation: "deleteDocument",
      module: "storage",
      documentId: id,
      itemsDeleted: itemsResult.rowCount ?? 0
    });`
  },
  {
    pattern: /console\.log\(`\[DB\] deleteDocument completed in \$\{endTime - startTime\}ms, success: \$\{success\}`\);/g,
    replacement: ``
  },
  {
    pattern: /console\.error\(`\[DB\] deleteDocument failed in \$\{endTime - startTime\}ms:`, error\);/g,
    replacement: `dbLogger.error("Database operation failed", {
      operation: "deleteDocument",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  // FIFO логи
  {
    pattern: /console\.log\(`🔄 FIFO-списание товара \$\{productId\}, количество: \$\{quantityToWriteoff\}`\);/g,
    replacement: `dbLogger.debug("FIFO writeoff started", {
      operation: "processWriteoffFIFO",
      module: "storage",
      productId,
      quantityToWriteoff
    });`
  },
  {
    pattern: /console\.log\(`📦 Найдено приходов: \$\{availableStock\.length\}`\);/g,
    replacement: `dbLogger.debug("Available stock found", {
      operation: "processWriteoffFIFO",
      module: "storage",
      productId,
      availableStockCount: availableStock.length
    });`
  },
  {
    pattern: /console\.log\(\s*`⚠️ Списание в минус: \$\{remainingToWriteoff\} единиц`\s*\);/g,
    replacement: `dbLogger.warn("Negative inventory writeoff", {
      operation: "processWriteoffFIFO",
      module: "storage",
      productId,
      remainingToWriteoff
    });`
  },
  {
    pattern: /console\.log\(`✅ FIFO-списание завершено`\);/g,
    replacement: `dbLogger.info("FIFO writeoff completed", {
      operation: "processWriteoffFIFO",
      module: "storage",
      productId
    });`
  },
  // Логи системы
  {
    pattern: /console\.error\("Error creating receipt document:", error\);/g,
    replacement: `dbLogger.error("Error creating receipt document", {
      operation: "createReceiptDocument",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  {
    pattern: /console\.error\("Error fetching logs:", error\);/g,
    replacement: `dbLogger.error("Error fetching logs", {
      operation: "getLogs",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  {
    pattern: /console\.error\("Error fetching log modules:", error\);/g,
    replacement: `dbLogger.error("Error fetching log modules", {
      operation: "getLogModules",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  {
    pattern: /console\.log\(`\[DB\] Cleared \$\{result\.rowCount \|\| 0\} log entries`\);/g,
    replacement: `dbLogger.info("Log entries cleared", {
      operation: "clearAllLogs",
      module: "storage",
      clearedCount: result.rowCount || 0
    });`
  },
  {
    pattern: /console\.error\("Error clearing logs:", error\);/g,
    replacement: `dbLogger.error("Error clearing logs", {
      operation: "clearAllLogs",
      module: "storage",
      error: getErrorMessage(error)
    });`
  },
  // Заказы
  {
    pattern: /console\.log\(`\[DB\] Starting getOrder for ID \$\{id\}\.\.\.`\);/g,
    replacement: ``
  },
  {
    pattern: /console\.log\(`\[DB\] Order \$\{id\} not found`\);/g,
    replacement: `dbLogger.info("Order not found", {
      operation: "getOrder",
      module: "storage",
      orderId: id
    });`
  },
  {
    pattern: /console\.log\(`\[DB\] getOrder completed for order \$\{id\} with \$\{itemsResult\.length\} items`\);/g,
    replacement: `dbLogger.info("Database operation completed", {
      operation: "getOrder",
      module: "storage",
      orderId: id,
      itemsCount: itemsResult.length
    });`
  }
];

function migrateStorageLogging() {
  try {
    console.log('🔧 Starting storage.ts logging migration...');
    
    // Читаем файл
    let content = fs.readFileSync(storageFilePath, 'utf8');
    
    // Применяем все замены
    let changesCount = 0;
    logReplacements.forEach((replacement, index) => {
      const beforeLength = content.length;
      content = content.replace(replacement.pattern, replacement.replacement);
      const afterLength = content.length;
      
      if (beforeLength !== afterLength) {
        changesCount++;
        console.log(`✅ Applied replacement ${index + 1}/${logReplacements.length}`);
      }
    });
    
    // Удаляем строки с только startTime/endTime расчетами если они остались
    content = content.replace(/const startTime = Date\.now\(\);\n/g, '');
    content = content.replace(/const endTime = Date\.now\(\);\n/g, '');
    
    // Записываем обратно
    fs.writeFileSync(storageFilePath, content, 'utf8');
    
    console.log(`🎉 Storage logging migration completed: ${changesCount} replacements applied`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
migrateStorageLogging();