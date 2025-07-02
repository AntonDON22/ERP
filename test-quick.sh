#!/bin/bash

# 🚀 Быстрый скрипт тестирования для разработки
# Запускает только критически важные тесты

echo "🚀 БЫСТРЫЕ ТЕСТЫ ERP СИСТЕМЫ"
echo "============================"

case "$1" in
    "unit")
        echo "⚡ Запуск Unit тестов (services, utils, middleware)..."
        NODE_ENV=test npx vitest run tests/services tests/utils tests/middleware tests/zFields.test.ts tests/logs.test.ts
        ;;
    "integration") 
        echo "⚡ Запуск Integration тестов..."
        NODE_ENV=test npx vitest run tests/integration
        ;;
    "cache")
        echo "⚡ Запуск Cache тестов..."
        NODE_ENV=test npx vitest run tests/cache
        ;;
    "validation")
        echo "⚡ Запуск Validation тестов..."
        NODE_ENV=test npx vitest run tests/validation tests/zFields
        ;;
    "critical")
        echo "⚡ Запуск критически важных тестов..."
        NODE_ENV=test npx vitest run tests/services/inventoryService.test.ts tests/services/cacheService.test.ts tests/integration/system.test.ts
        ;;
    "all")
        echo "⚡ Запуск всех тестов через vitest..."
        NODE_ENV=test npx vitest run
        ;;
    *)
        echo "Использование: ./test-quick.sh [unit|integration|cache|validation|critical|all]"
        echo ""
        echo "Примеры:"
        echo "  ./test-quick.sh unit         # Unit тесты (быстро)"
        echo "  ./test-quick.sh integration  # Integration тесты"
        echo "  ./test-quick.sh critical     # Только критически важные"
        echo "  ./test-quick.sh all          # Все тесты"
        exit 1
        ;;
esac