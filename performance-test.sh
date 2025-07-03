#!/bin/bash

echo "🚀 КОМПЛЕКСНЫЙ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ СИСТЕМЫ"
echo "=============================================="

# Функция для измерения времени API
measure_api_time() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    
    if [ "$method" = "GET" ]; then
        response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:5000/api$endpoint")
    else
        response_time=$(curl -s -w "%{time_total}" -o /dev/null -X "$method" -H "Content-Type: application/json" -d "$data" "http://localhost:5000/api$endpoint")
    fi
    
    # Конвертируем в миллисекунды
    echo "scale=0; $response_time * 1000" | bc
}

# Проверка что сервер работает
echo "🔍 Проверка доступности сервера..."
if ! curl -s http://localhost:5000/api/products > /dev/null; then
    echo "❌ Сервер недоступен на порту 5000"
    exit 1
fi
echo "✅ Сервер работает"

# 1. Тест времени отклика основных API endpoints
echo ""
echo "⏱️ ТЕСТ ВРЕМЕНИ ОТКЛИКА API (миллисекунды)"
echo "========================================="

# Базовые GET запросы
products_time=$(measure_api_time "/products")
suppliers_time=$(measure_api_time "/suppliers")
contractors_time=$(measure_api_time "/contractors")
warehouses_time=$(measure_api_time "/warehouses")
documents_time=$(measure_api_time "/documents")
orders_time=$(measure_api_time "/orders")
inventory_time=$(measure_api_time "/inventory")
inventory_avail_time=$(measure_api_time "/inventory/availability")

echo "📦 /api/products:              ${products_time}ms"
echo "🏭 /api/suppliers:             ${suppliers_time}ms"
echo "👥 /api/contractors:           ${contractors_time}ms"
echo "🏢 /api/warehouses:            ${warehouses_time}ms"
echo "📄 /api/documents:             ${documents_time}ms"
echo "🛒 /api/orders:                ${orders_time}ms"
echo "📊 /api/inventory:             ${inventory_time}ms"
echo "🔄 /api/inventory/availability: ${inventory_avail_time}ms"

# Вычисляем среднее время
total_time=$((products_time + suppliers_time + contractors_time + warehouses_time + documents_time + orders_time + inventory_time + inventory_avail_time))
avg_time=$((total_time / 8))

echo ""
echo "📊 СРЕДНЕЕ ВРЕМЯ API: ${avg_time}ms"

# 2. Тест производительности с созданием данных
echo ""
echo "🔥 НАГРУЗОЧНЫЙ ТЕСТ - СОЗДАНИЕ ДАННЫХ"
echo "====================================="

# Создание товаров
echo "📦 Создание 10 тестовых товаров..."
created_products=0
start_time=$(date +%s%3N)

for i in {1..10}; do
    product_data="{\"name\":\"ТестТовар${i}\",\"sku\":\"TEST${i}\",\"price\":\"${i}00\",\"purchasePrice\":\"${i}0\"}"
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$product_data" "http://localhost:5000/api/products")
    if [[ "$response" == *"200"* ]] || [[ "$response" == *"201"* ]]; then
        ((created_products++))
    fi
done

products_creation_time=$(($(date +%s%3N) - start_time))
echo "✅ Создано товаров: $created_products/10 за ${products_creation_time}ms"

# Создание складов
echo "🏢 Создание 3 тестовых складов..."
created_warehouses=0
start_time=$(date +%s%3N)

for i in {1..3}; do
    warehouse_data="{\"name\":\"ТестСклад${i}\",\"address\":\"Адрес ${i}\"}"
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$warehouse_data" "http://localhost:5000/api/warehouses")
    if [[ "$response" == *"200"* ]] || [[ "$response" == *"201"* ]]; then
        ((created_warehouses++))
    fi
done

warehouses_creation_time=$(($(date +%s%3N) - start_time))
echo "✅ Создано складов: $created_warehouses/3 за ${warehouses_creation_time}ms"

# Создание контрагентов
echo "👥 Создание 5 тестовых контрагентов..."
created_contractors=0
start_time=$(date +%s%3N)

for i in {1..5}; do
    contractor_data="{\"name\":\"ТестКонтрагент${i}\",\"website\":\"test${i}.com\"}"
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$contractor_data" "http://localhost:5000/api/contractors")
    if [[ "$response" == *"200"* ]] || [[ "$response" == *"201"* ]]; then
        ((created_contractors++))
    fi
done

contractors_creation_time=$(($(date +%s%3N) - start_time))
echo "✅ Создано контрагентов: $created_contractors/5 за ${contractors_creation_time}ms"

# 3. Тест кеширования - повторные запросы
echo ""
echo "💾 ТЕСТ ЭФФЕКТИВНОСТИ КЕШИРОВАНИЯ"
echo "================================="

echo "🔄 Первый запрос остатков (без кеша)..."
first_request_time=$(measure_api_time "/inventory/availability")
echo "   Время: ${first_request_time}ms"

echo "🔄 Второй запрос остатков (с кешем)..."
second_request_time=$(measure_api_time "/inventory/availability")
echo "   Время: ${second_request_time}ms"

if [ "$second_request_time" -lt "$first_request_time" ]; then
    improvement=$((first_request_time - second_request_time))
    echo "✅ Кеширование работает! Улучшение: ${improvement}ms"
else
    echo "⚠️ Кеширование не дало значительного улучшения"
fi

# 4. Проверка системных метрик
echo ""
echo "📊 СИСТЕМНЫЕ МЕТРИКИ"
echo "==================="

metrics_response=$(curl -s "http://localhost:5000/api/metrics")
echo "🎯 Метрики производительности:"
echo "$metrics_response" | grep -o '"cacheHitRate":[0-9]*' | sed 's/"cacheHitRate":/Cache Hit Rate: /' | sed 's/$/%)/'
echo "$metrics_response" | grep -o '"averageResponseTime":[0-9]*' | sed 's/"averageResponseTime":/Среднее время API: /' | sed 's/$/ms/'

# 5. Итоговый отчет
echo ""
echo "📋 ИТОГОВЫЙ ОТЧЕТ ПРОИЗВОДИТЕЛЬНОСТИ"
echo "===================================="
echo "🚀 Среднее время API:     ${avg_time}ms"
echo "📦 Создание товаров:      ${products_creation_time}ms (${created_products}/10)"
echo "🏢 Создание складов:      ${warehouses_creation_time}ms (${created_warehouses}/3)"
echo "👥 Создание контрагентов: ${contractors_creation_time}ms (${created_contractors}/5)"
echo "💾 Эффект кеширования:    ${first_request_time}ms → ${second_request_time}ms"

# Оценка производительности
if [ "$avg_time" -lt 100 ]; then
    echo "🟢 ОТЛИЧНО: Система показывает высокую производительность"
elif [ "$avg_time" -lt 200 ]; then
    echo "🟡 ХОРОШО: Производительность системы в норме"
else
    echo "🔴 ВНИМАНИЕ: Требуется оптимизация производительности"
fi

echo ""
echo "✅ Тест производительности завершен"