#!/bin/bash

echo "🔥 ЗАПУСК СТРЕСС-ТЕСТА ERP СИСТЕМЫ"
echo "=================================="
echo ""

# Проверяем, что сервер запущен
echo "🔍 Проверка состояния сервера..."
if ! curl -s http://localhost:5000/api/metrics > /dev/null; then
    echo "❌ Сервер не запущен на порту 5000!"
    echo "Запустите сервер командой: npm run dev"
    exit 1
fi

echo "✅ Сервер запущен и готов к тестированию"
echo ""

# Показываем текущее состояние системы
echo "📊 Текущее состояние системы:"
METRICS=$(curl -s http://localhost:5000/api/metrics)
echo "   Cache Hit Rate: $(echo $METRICS | grep -o '"cacheHitRate":[0-9.]*' | cut -d: -f2)%"
echo "   Average Response Time: $(echo $METRICS | grep -o '"averageResponseTime":[0-9.]*' | cut -d: -f2)ms"
echo ""

# Запускаем стресс-тест
echo "🚀 Запуск стресс-теста..."
echo "   Это может занять 10-15 минут для создания:"
echo "   • 1000+ товаров"
echo "   • 500+ документов движения"
echo "   • 200+ заказов с резервами"
echo ""

# Настройки vitest для стресс-теста
export VITEST_CONFIG='{
  "testTimeout": 600000,
  "maxConcurrency": 1,
  "reporter": "verbose"
}'

# Запуск стресс-теста с подробным выводом
npx vitest run tests/stress/stress-test.ts --reporter=verbose --no-coverage 2>&1 | tee stress-test-results.log

# Показываем итоги
echo ""
echo "📈 АНАЛИЗ РЕЗУЛЬТАТОВ СТРЕСС-ТЕСТА"
echo "=================================="

# Парсим результаты из лога
if [ -f "stress-test-results.log" ]; then
    echo ""
    echo "📊 Ключевые метрики:"
    
    # Извлекаем метрики из лога
    PRODUCTS_CREATED=$(grep "Создано.*товаров" stress-test-results.log | tail -1 | grep -o '[0-9]*' | head -1)
    DOCUMENTS_CREATED=$(grep "Создано.*документов" stress-test-results.log | tail -1 | grep -o '[0-9]*' | head -1)
    ORDERS_CREATED=$(grep "Создано.*заказов" stress-test-results.log | tail -1 | grep -o '[0-9]*' | head -1)
    
    if [ ! -z "$PRODUCTS_CREATED" ]; then
        echo "   ✅ Товары созданы: $PRODUCTS_CREATED"
    fi
    
    if [ ! -z "$DOCUMENTS_CREATED" ]; then
        echo "   ✅ Документы созданы: $DOCUMENTS_CREATED"
    fi
    
    if [ ! -z "$ORDERS_CREATED" ]; then
        echo "   ✅ Заказы созданы: $ORDERS_CREATED"
    fi
    
    # Показываем производительность API
    echo ""
    echo "🚀 Производительность после нагрузки:"
    FINAL_METRICS=$(curl -s http://localhost:5000/api/metrics)
    echo "   Cache Hit Rate: $(echo $FINAL_METRICS | grep -o '"cacheHitRate":[0-9.]*' | cut -d: -f2)%"
    echo "   Average Response Time: $(echo $FINAL_METRICS | grep -o '"averageResponseTime":[0-9.]*' | cut -d: -f2)ms"
    
    # Проверяем состояние базы данных
    echo ""
    echo "🗄️ Состояние базы данных:"
    
    PRODUCTS_COUNT=$(curl -s http://localhost:5000/api/products | jq '. | length' 2>/dev/null || echo "N/A")
    DOCUMENTS_COUNT=$(curl -s http://localhost:5000/api/documents | jq '. | length' 2>/dev/null || echo "N/A")
    ORDERS_COUNT=$(curl -s http://localhost:5000/api/orders | jq '. | length' 2>/dev/null || echo "N/A")
    INVENTORY_COUNT=$(curl -s http://localhost:5000/api/inventory | jq '. | length' 2>/dev/null || echo "N/A")
    
    echo "   📦 Всего товаров: $PRODUCTS_COUNT"
    echo "   📄 Всего документов: $DOCUMENTS_COUNT"
    echo "   🛒 Всего заказов: $ORDERS_COUNT"
    echo "   📊 Позиций в остатках: $INVENTORY_COUNT"
    
    echo ""
    echo "💾 Результаты сохранены в: stress-test-results.log"
    
    # Проверяем успешность тестов
    if grep -q "❌" stress-test-results.log; then
        echo ""
        echo "⚠️ ОБНАРУЖЕНЫ ОШИБКИ В СТРЕСС-ТЕСТЕ"
        echo "Проверьте лог файл для деталей"
        exit 1
    else
        echo ""
        echo "🎉 СТРЕСС-ТЕСТ ЗАВЕРШЕН УСПЕШНО!"
        echo "Система выдержала максимальную нагрузку"
    fi
else
    echo "❌ Не удалось найти результаты стресс-теста"
    exit 1
fi

echo ""
echo "🔍 Для детального анализа производительности запустите:"
echo "   npm run test:performance"
echo ""