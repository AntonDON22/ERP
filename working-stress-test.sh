#!/bin/bash

echo "🔥 РАБОЧИЙ СТРЕСС-ТЕСТ - СОЗДАНИЕ РЕАЛЬНЫХ ДАННЫХ"
echo "================================================"
echo ""

BASE_URL="http://localhost:5000/api"

# Проверяем сервер
if ! curl -s $BASE_URL/metrics > /dev/null; then
    echo "❌ Сервер недоступен"
    exit 1
fi

echo "✅ Сервер работает, начинаем создание данных..."
echo ""

# Создаем 50 товаров с полными данными
echo "📦 Создание 50 новых товаров..."
CREATED_PRODUCTS=0
for i in {1..50}; do
    RESPONSE=$(curl -s -X POST $BASE_URL/products \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"СтрессТовар-${i}-$(date +%s)\",
            \"sku\": \"STRESS-${i}-$(date +%s)\",
            \"price\": $((100 + i * 10)),
            \"purchasePrice\": $((50 + i * 5)),
            \"weight\": $((10 + i)),
            \"barcode\": \"1234567890${i}\",
            \"dimensions\": \"${i}x${i}x${i}\"
        }")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        CREATED_PRODUCTS=$((CREATED_PRODUCTS + 1))
        if [ $((i % 10)) -eq 0 ]; then
            echo "   ✅ Создано $CREATED_PRODUCTS товаров из $i попыток"
        fi
    else
        echo "   ❌ Ошибка создания товара $i: $RESPONSE"
    fi
done

echo "✅ Итого создано $CREATED_PRODUCTS товаров"
echo ""

# Создаем склады
echo "🏭 Создание 5 складов..."
CREATED_WAREHOUSES=0
for i in {1..5}; do
    WAREHOUSE_RESPONSE=$(curl -s -X POST $BASE_URL/warehouses \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"СтрессСклад-${i}-$(date +%s)\",
            \"location\": \"Адрес склада номер ${i}\"
        }")
    
    if echo "$WAREHOUSE_RESPONSE" | grep -q '"id"'; then
        CREATED_WAREHOUSES=$((CREATED_WAREHOUSES + 1))
    fi
done

echo "✅ Создано $CREATED_WAREHOUSES складов"

# Создаем контрагентов
echo "👥 Создание 10 контрагентов..."
CREATED_CONTRACTORS=0
for i in {1..10}; do
    CONTRACTOR_RESPONSE=$(curl -s -X POST $BASE_URL/contractors \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"СтрессКонтрагент-${i}-$(date +%s)\",
            \"website\": \"https://contractor${i}.example.com\"
        }")
    
    if echo "$CONTRACTOR_RESPONSE" | grep -q '"id"'; then
        CREATED_CONTRACTORS=$((CREATED_CONTRACTORS + 1))
    fi
done

echo "✅ Создано $CREATED_CONTRACTORS контрагентов"
echo ""

# Получаем списки для создания документов
echo "📋 Получаем списки товаров и складов..."
PRODUCTS_LIST=$(curl -s $BASE_URL/products)
WAREHOUSES_LIST=$(curl -s $BASE_URL/warehouses)
CONTRACTORS_LIST=$(curl -s $BASE_URL/contractors)

# Извлекаем ID для использования в документах
PRODUCT_IDS=($(echo "$PRODUCTS_LIST" | grep -o '"id":[0-9]*' | cut -d: -f2 | tail -20))
WAREHOUSE_IDS=($(echo "$WAREHOUSES_LIST" | grep -o '"id":[0-9]*' | cut -d: -f2 | tail -5))
CONTRACTOR_IDS=($(echo "$CONTRACTORS_LIST" | grep -o '"id":[0-9]*' | cut -d: -f2 | tail -5))

echo "   Доступно товаров для документов: ${#PRODUCT_IDS[@]}"
echo "   Доступно складов: ${#WAREHOUSE_IDS[@]}"
echo "   Доступно контрагентов: ${#CONTRACTOR_IDS[@]}"
echo ""

# Создаем документы приходования
echo "📄 Создание 30 документов приходования..."
CREATED_DOCS=0
for i in {1..30}; do
    if [ ${#PRODUCT_IDS[@]} -gt 0 ] && [ ${#WAREHOUSE_IDS[@]} -gt 0 ]; then
        PRODUCT_ID=${PRODUCT_IDS[$((RANDOM % ${#PRODUCT_IDS[@]}))]}
        WAREHOUSE_ID=${WAREHOUSE_IDS[$((RANDOM % ${#WAREHOUSE_IDS[@]}))]}
        
        DOC_RESPONSE=$(curl -s -X POST $BASE_URL/documents/receipt \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"receipt\",
                \"warehouseId\": $WAREHOUSE_ID,
                \"items\": [{
                    \"productId\": $PRODUCT_ID,
                    \"quantity\": $((RANDOM % 100 + 1)),
                    \"price\": $((RANDOM % 1000 + 100))
                }]
            }")
        
        if echo "$DOC_RESPONSE" | grep -q '"id"'; then
            CREATED_DOCS=$((CREATED_DOCS + 1))
        fi
        
        if [ $((i % 10)) -eq 0 ]; then
            echo "   ✅ Создано $CREATED_DOCS документов из $i попыток"
        fi
    fi
done

echo "✅ Итого создано $CREATED_DOCS документов"
echo ""

# Создаем заказы с резервированием
echo "🛒 Создание 20 заказов с резервированием..."
CREATED_ORDERS=0
for i in {1..20}; do
    if [ ${#PRODUCT_IDS[@]} -gt 0 ] && [ ${#CONTRACTOR_IDS[@]} -gt 0 ]; then
        PRODUCT_ID=${PRODUCT_IDS[$((RANDOM % ${#PRODUCT_IDS[@]}))]}
        CONTRACTOR_ID=${CONTRACTOR_IDS[$((RANDOM % ${#CONTRACTOR_IDS[@]}))]}
        IS_RESERVED=$([ $((RANDOM % 2)) -eq 0 ] && echo "true" || echo "false")
        
        ORDER_RESPONSE=$(curl -s -X POST $BASE_URL/orders \
            -H "Content-Type: application/json" \
            -d "{
                \"customerId\": $CONTRACTOR_ID,
                \"isReserved\": $IS_RESERVED,
                \"items\": [{
                    \"productId\": $PRODUCT_ID,
                    \"quantity\": $((RANDOM % 10 + 1)),
                    \"price\": $((RANDOM % 1000 + 200))
                }]
            }")
        
        if echo "$ORDER_RESPONSE" | grep -q '"id"'; then
            CREATED_ORDERS=$((CREATED_ORDERS + 1))
        fi
        
        if [ $((i % 10)) -eq 0 ]; then
            echo "   ✅ Создано $CREATED_ORDERS заказов из $i попыток"
        fi
    fi
done

echo "✅ Итого создано $CREATED_ORDERS заказов"
echo ""

# Проверяем результаты
echo "📊 ПРОВЕРКА СОЗДАННЫХ ДАННЫХ"
echo "============================="
echo ""

# Подсчитываем записи в системе
TOTAL_PRODUCTS=$(echo "$PRODUCTS_LIST" | grep -o '"id":' | wc -l)
TOTAL_WAREHOUSES=$(echo "$WAREHOUSES_LIST" | grep -o '"id":' | wc -l)
TOTAL_CONTRACTORS=$(echo "$CONTRACTORS_LIST" | grep -o '"id":' | wc -l)

# Получаем актуальные данные после создания
CURRENT_PRODUCTS=$(curl -s $BASE_URL/products | grep -o '"id":' | wc -l)
CURRENT_DOCUMENTS=$(curl -s $BASE_URL/documents | grep -o '"id":' | wc -l)
CURRENT_ORDERS=$(curl -s $BASE_URL/orders | grep -o '"id":' | wc -l)
CURRENT_INVENTORY=$(curl -s $BASE_URL/inventory | grep -o '"id":' | wc -l)

echo "📦 Товары: было $TOTAL_PRODUCTS → стало $CURRENT_PRODUCTS (+$((CURRENT_PRODUCTS - TOTAL_PRODUCTS)))"
echo "🏭 Склады: стало $TOTAL_WAREHOUSES"
echo "👥 Контрагенты: стало $TOTAL_CONTRACTORS"
echo "📄 Документы: $CURRENT_DOCUMENTS"
echo "🛒 Заказы: $CURRENT_ORDERS"
echo "📊 Остатки: $CURRENT_INVENTORY позиций"
echo ""

# Тестируем производительность с новыми данными
echo "⚡ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ С НОВЫМИ ДАННЫМИ"
echo "==========================================="
echo ""

for endpoint in "products" "inventory" "inventory/availability" "documents" "orders"; do
    START=$(date +%s%3N)
    RESPONSE=$(curl -s $BASE_URL/$endpoint)
    END=$(date +%s%3N)
    TIME=$((END - START))
    
    COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
    
    if [ $TIME -lt 200 ]; then
        STATUS="🟢 Быстро"
    elif [ $TIME -lt 500 ]; then
        STATUS="🟡 Средне"
    else
        STATUS="🔴 Медленно"
    fi
    
    echo "   $STATUS /$endpoint: ${TIME}ms ($COUNT записей)"
done

echo ""

# Проверяем метрики системы
echo "📈 Финальные метрики системы:"
FINAL_METRICS=$(curl -s $BASE_URL/metrics)
echo "$FINAL_METRICS" | sed 's/,/\n/g' | sed 's/[{}"]//g' | grep -E "(cacheHitRate|averageResponseTime|systemHealth)" | sed 's/:/: /'

echo ""
echo "🎉 СТРЕСС-ТЕСТ ЗАВЕРШЕН!"
echo "======================="
echo ""
echo "✅ Успешно создано:"
echo "   • $CREATED_PRODUCTS товаров"
echo "   • $CREATED_WAREHOUSES складов"
echo "   • $CREATED_CONTRACTORS контрагентов"
echo "   • $CREATED_DOCS документов движения"
echo "   • $CREATED_ORDERS заказов с резервированием"
echo ""
echo "💡 Обновите страницы в браузере чтобы увидеть новые данные!"
echo "💡 Проверьте модули: Товары, Документы, Заказы, Остатки"
echo ""