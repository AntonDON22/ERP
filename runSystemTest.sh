#!/bin/bash

# 🧪 Скрипт запуска интеграционного тестирования ERP системы
# 
# Использование:
#   ./runSystemTest.sh                    # Локальное тестирование
#   TEST_API_URL=http://prod/api ./runSystemTest.sh  # Продакшн

echo "🧪 Запуск интеграционного тестирования системы ERP..."
echo "📊 Конфигурация:"
echo "   API URL: ${TEST_API_URL:-http://localhost:5000/api}"
echo "   Log Level: ${TEST_LOG_LEVEL:-INFO}"
echo "   Timeout: ${TEST_TIMEOUT:-5000}ms"
echo ""

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js для запуска тестов."
    exit 1
fi

# Проверка наличия tsx
if ! command -v npx &> /dev/null; then
    echo "❌ npx не найден. Убедитесь что npm установлен."
    exit 1
fi

# Запуск тестов
echo "🚀 Выполнение тестов..."
npx tsx tests/integration/system.test.ts

# Сохранение кода выхода
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Все тесты пройдены успешно!"
else
    echo "❌ Тесты завершились с ошибками (код: $EXIT_CODE)"
fi

exit $EXIT_CODE