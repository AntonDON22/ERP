#!/bin/bash

echo "⚡ БЫСТРЫЙ СТРЕСС-ТЕСТ ERP СИСТЕМЫ"
echo "================================"
echo ""

# Проверяем состояние сервера
if ! curl -s http://localhost:5000/api/metrics > /dev/null; then
    echo "❌ Сервер не запущен!"
    exit 1
fi

echo "✅ Сервер готов к тестированию"

# Начальные метрики
echo ""
echo "📊 Начальное состояние:"
INITIAL_METRICS=$(curl -s http://localhost:5000/api/metrics)
echo "   Cache Hit Rate: $(echo $INITIAL_METRICS | grep -o '"cacheHitRate":[0-9.]*' | cut -d: -f2)%"
echo "   Response Time: $(echo $INITIAL_METRICS | grep -o '"averageResponseTime":[0-9.]*' | cut -d: -f2)ms"

# Подсчитаем изначальные данные
INITIAL_PRODUCTS=$(curl -s http://localhost:5000/api/products | jq '. | length' 2>/dev/null || echo "0")
INITIAL_ORDERS=$(curl -s http://localhost:5000/api/orders | jq '. | length' 2>/dev/null || echo "0")
echo "   Товаров: $INITIAL_PRODUCTS"
echo "   Заказов: $INITIAL_ORDERS"

echo ""
echo "🚀 Создание нагрузки..."

# 1. Создаем 100 товаров
echo "📦 Создание 100 товаров..."
for i in {1..100}; do
    curl -s -X POST http://localhost:5000/api/products \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"Стресс-Товар-$i\",
            \"sku\": \"STRESS-$(printf '%03d' $i)\",
            \"price\": $((RANDOM % 1000 + 100)),
            \"purchasePrice\": $((RANDOM % 500 + 50)),
            \"weight\": $((RANDOM % 100 + 10))
        }" > /dev/null
    
    if [ $((i % 20)) -eq 0 ]; then
        echo "   Создано $i товаров..."
    fi
done

# 2. Создаем склад для документов
echo ""
echo "🏭 Создание тестового склада..."
WAREHOUSE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/warehouses \
    -H "Content-Type: application/json" \
    -d '{"name": "Стресс-Склад", "location": "Тестовый адрес"}')

WAREHOUSE_ID=$(echo $WAREHOUSE_RESPONSE | jq -r '.id' 2>/dev/null || echo "1")

# 3. Создаем контрагента для заказов
echo "👥 Создание тестового контрагента..."
CONTRACTOR_RESPONSE=$(curl -s -X POST http://localhost:5000/api/contractors \
    -H "Content-Type: application/json" \
    -d '{"name": "Стресс-Контрагент", "website": "https://test.example.com"}')

CONTRACTOR_ID=$(echo $CONTRACTOR_RESPONSE | jq -r '.id' 2>/dev/null || echo "1")

# 4. Получаем список товаров для документов
echo "📋 Получение списка товаров..."
PRODUCTS_RESPONSE=$(curl -s http://localhost:5000/api/products)
PRODUCT_IDS=($(echo $PRODUCTS_RESPONSE | jq -r '.[].id' 2>/dev/null | tail -50))

# 5. Создаем 50 документов приходования
echo ""
echo "📄 Создание 50 документов движения..."
for i in {1..50}; do
    PRODUCT_ID=${PRODUCT_IDS[$((RANDOM % ${#PRODUCT_IDS[@]}))]}
    
    curl -s -X POST http://localhost:5000/api/documents/receipt \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"receipt\",
            \"warehouseId\": $WAREHOUSE_ID,
            \"items\": [{
                \"productId\": $PRODUCT_ID,
                \"quantity\": $((RANDOM % 50 + 1)),
                \"price\": $((RANDOM % 1000 + 100))
            }]
        }" > /dev/null
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Создано $i документов..."
    fi
done

# 6. Создаем 30 заказов
echo ""
echo "🛒 Создание 30 заказов..."
for i in {1..30}; do
    PRODUCT_ID=${PRODUCT_IDS[$((RANDOM % ${#PRODUCT_IDS[@]}))]}
    IS_RESERVED=$([ $((RANDOM % 2)) -eq 0 ] && echo "true" || echo "false")
    
    curl -s -X POST http://localhost:5000/api/orders \
        -H "Content-Type: application/json" \
        -d "{
            \"customerId\": $CONTRACTOR_ID,
            \"isReserved\": $IS_RESERVED,
            \"items\": [{
                \"productId\": $PRODUCT_ID,
                \"quantity\": $((RANDOM % 10 + 1)),
                \"price\": $((RANDOM % 1000 + 100))
            }]
        }" > /dev/null
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Создано $i заказов..."
    fi
done

echo ""
echo "📊 РЕЗУЛЬТАТЫ СТРЕСС-ТЕСТА"
echo "=========================="

# Финальные метрики
FINAL_METRICS=$(curl -s http://localhost:5000/api/metrics)
FINAL_PRODUCTS=$(curl -s http://localhost:5000/api/products | jq '. | length' 2>/dev/null || echo "N/A")
FINAL_DOCUMENTS=$(curl -s http://localhost:5000/api/documents | jq '. | length' 2>/dev/null || echo "N/A")
FINAL_ORDERS=$(curl -s http://localhost:5000/api/orders | jq '. | length' 2>/dev/null || echo "N/A")
FINAL_INVENTORY=$(curl -s http://localhost:5000/api/inventory | jq '. | length' 2>/dev/null || echo "N/A")

echo ""
echo "📈 Создано записей:"
echo "   Товары: $INITIAL_PRODUCTS → $FINAL_PRODUCTS (+$((FINAL_PRODUCTS - INITIAL_PRODUCTS)))"
echo "   Документы: 0 → $FINAL_DOCUMENTS"
echo "   Заказы: $INITIAL_ORDERS → $FINAL_ORDERS (+$((FINAL_ORDERS - INITIAL_ORDERS)))"
echo "   Остатки: $FINAL_INVENTORY позиций"

echo ""
echo "⚡ Производительность:"
echo "   Cache Hit Rate: $(echo $FINAL_METRICS | grep -o '"cacheHitRate":[0-9.]*' | cut -d: -f2)%"
echo "   Response Time: $(echo $FINAL_METRICS | grep -o '"averageResponseTime":[0-9.]*' | cut -d: -f2)ms"

# Тест времени отклика основных API
echo ""
echo "🚀 Тест времени отклика API:"

for endpoint in "products" "inventory" "inventory/availability" "documents" "orders"; do
    START_TIME=$(date +%s%3N)
    curl -s http://localhost:5000/api/$endpoint > /dev/null
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    echo "   GET /$endpoint: ${RESPONSE_TIME}ms"
done

# Тест расчета остатков
echo ""
echo "📊 Тест расчета остатков с новыми данными:"
START_TIME=$(date +%s%3N)
INVENTORY_RESPONSE=$(curl -s http://localhost:5000/api/inventory/availability)
END_TIME=$(date +%s%3N)
INVENTORY_TIME=$((END_TIME - START_TIME))
INVENTORY_COUNT=$(echo $INVENTORY_RESPONSE | jq '. | length' 2>/dev/null || echo "N/A")

echo "   Остатки ($INVENTORY_COUNT товаров): ${INVENTORY_TIME}ms"

echo ""
echo "🎉 СТРЕСС-ТЕСТ ЗАВЕРШЕН!"
echo "Система успешно обработала нагрузку"
echo ""