#!/usr/bin/env python3
import re

# Читаем файл storage.ts
with open('server/storage.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Замена console.log на dbLogger
patterns = [
    # Заменяем console.log('[DB] Starting getXXX query...');
    (r"console\.log\('\[DB\] Starting ([^']*) query[^']*'\);", r"const endOperation = dbLogger.startOperation('\1');"),
    
    # Заменяем console.log(`[DB] getXXX completed...`);
    (r"console\.log\(`\[DB\] ([^`]*) completed in \$\{endTime - startTime\}ms[^`]*`\);", r"// Logging handled by endOperation()"),
    
    # Заменяем console.error с ошибками
    (r"console\.error\(`\[DB\] ([^`]*) failed after \$\{endTime - startTime\}ms:\`, error\);", r"dbLogger.error('Error in \1', { error: getErrorMessage(error) });"),
    (r"console\.error\('\[DB\] Error in ([^']*):',\s*error\);", r"dbLogger.error('Error in \1', { error: getErrorMessage(error) });"),
    (r"console\.error\(`\[DB\] ([^`]*) error:\`, error\);", r"dbLogger.error('Error in \1', { error: getErrorMessage(error) });"),
    
    # Удаляем старые переменные времени
    (r"const startTime = Date\.now\(\);\s*", ""),
    (r"const endTime = Date\.now\(\);\s*", ""),
    
    # Специальные замены для FIFO логирования
    (r"console\.log\(`🔄 FIFO-списание товара \$\{productId\}, количество: \$\{quantityToWriteoff\}`\);", r"inventoryLogger.info('Starting FIFO writeoff', { productId, quantity: quantityToWriteoff });"),
    (r"console\.log\(`📦 Найдено приходов: \$\{availableStock\.length\}`\);", r"inventoryLogger.debug('Found incoming stock batches', { count: availableStock.length });"),
    (r"console\.log\(`📤 Списано \$\{quantityToTakeFromThisBatch\} из партии \$\{stockItem\.id\}, остается списать: \$\{remainingToWriteoff\}`\);", r"inventoryLogger.debug('Writing off from batch', { batchId: stockItem.id, quantity: quantityToTakeFromThisBatch, remaining: remainingToWriteoff });"),
    (r"console\.log\(`⚠️ Списание в минус: \$\{remainingToWriteoff\} единиц`\);", r"inventoryLogger.warn('Negative inventory writeoff', { negativeQuantity: remainingToWriteoff });"),
    (r"console\.log\(`✅ FIFO-списание завершено`\);", r"inventoryLogger.info('FIFO writeoff completed');"),
]

# Применяем замены
for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

# Записываем обратно
with open('server/storage.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Замены выполнены успешно!")