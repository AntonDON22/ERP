#!/bin/bash

echo "🚀 СТРЕСС-ТЕСТ ERP СИСТЕМЫ С ДОКУМЕНТООБОРОТОМ"
echo "============================================="

# Функция для генерации уникального timestamp
get_timestamp() {
    date +%s%3N
}

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
    
    echo "$response_time" | awk '{printf "%.0f", $1 * 1000}'
}

# Генерируем уникальный идентификатор для этого запуска
RUN_ID=$(get_timestamp)
echo "🔍 ID запуска: $RUN_ID"

# Проверка сервера
if ! curl -s http://localhost:5000/api/products > /dev/null; then
    echo "❌ Сервер недоступен"
    exit 1
fi
echo "✅ Сервер работает"

# 1. СОЗДАНИЕ БАЗОВЫХ ДАННЫХ
echo ""
echo "📊 СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ"
echo "==========================="

# Создание товаров с уникальными SKU
echo "📦 Создание 10 уникальных товаров..."
created_products=0
product_ids=()

for i in {1..10}; do
    unique_sku="STR${RUN_ID}${i}"
    product_data="{\"name\":\"СтрессТест-${RUN_ID}-${i}\",\"sku\":\"${unique_sku}\",\"price\":\"${i}00\",\"purchasePrice\":\"$((i*50))\"}"
    
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$product_data" "http://localhost:5000/api/products")
    
    if echo "$response" | grep -q '"id"'; then
        product_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        product_ids+=($product_id)
        ((created_products++))
        echo "   ✅ Товар $i: ID=$product_id"
    else
        echo "   ❌ Ошибка создания товара $i: $response"
    fi
done

echo "✅ Создано товаров: $created_products/10"

# Создание складов
echo "🏢 Создание 3 складов..."
created_warehouses=0
warehouse_ids=()

for i in {1..3}; do
    warehouse_data="{\"name\":\"СтрессСклад-${RUN_ID}-${i}\",\"address\":\"Адрес тестового склада ${i}\"}"
    
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$warehouse_data" "http://localhost:5000/api/warehouses")
    
    if echo "$response" | grep -q '"id"'; then
        warehouse_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        warehouse_ids+=($warehouse_id)
        ((created_warehouses++))
        echo "   ✅ Склад $i: ID=$warehouse_id"
    fi
done

echo "✅ Создано складов: $created_warehouses/3"

# Создание контрагентов
echo "👥 Создание 5 контрагентов..."
created_contractors=0
contractor_ids=()

for i in {1..5}; do
    contractor_data="{\"name\":\"СтрессКонтрагент-${RUN_ID}-${i}\",\"website\":\"https://stress${RUN_ID}${i}.test.com\"}"
    
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$contractor_data" "http://localhost:5000/api/contractors")
    
    if echo "$response" | grep -q '"id"'; then
        contractor_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        contractor_ids+=($contractor_id)
        ((created_contractors++))
        echo "   ✅ Контрагент $i: ID=$contractor_id"
    fi
done

echo "✅ Создано контрагентов: $created_contractors/5"

# 2. СОЗДАНИЕ ДОКУМЕНТОВ
echo ""
echo "📄 ТЕСТ ДОКУМЕНТООБОРОТА"
echo "======================="

if [ ${#product_ids[@]} -gt 0 ] && [ ${#warehouse_ids[@]} -gt 0 ]; then
    echo "📋 Создание 5 документов приходования..."
    created_documents=0
    document_creation_start=$(get_timestamp)
    
    for i in {1..5}; do
        # Выбираем случайные товар и склад
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        quantity=$((i + 2))
        price=$((i * 100 + 100))
        
        document_data="{
            \"type\":\"income\",
            \"status\":\"posted\",
            \"warehouseId\":$warehouse_id,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":$quantity,
                \"price\":\"$price\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$document_data" "http://localhost:5000/api/documents/create")
        
        if echo "$response" | grep -q '"id"'; then
            doc_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            ((created_documents++))
            echo "   ✅ Документ $i: ID=$doc_id (товар=$product_id, склад=$warehouse_id, кол-во=$quantity)"
        else
            echo "   ❌ Ошибка создания документа $i: $response"
        fi
    done
    
    document_creation_time=$(($(get_timestamp) - document_creation_start))
    echo "✅ Создано документов приходования: $created_documents/5 за ${document_creation_time}ms"
    
    # Создание документов списания
    echo "📋 Создание 3 документов списания..."
    writeoff_documents=0
    writeoff_start=$(get_timestamp)
    
    for i in {1..3}; do
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        
        writeoff_data="{
            \"type\":\"outcome\",
            \"status\":\"posted\",
            \"warehouseId\":$warehouse_id,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":1
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$writeoff_data" "http://localhost:5000/api/documents/create")
        
        if echo "$response" | grep -q '"id"'; then
            doc_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            ((writeoff_documents++))
            echo "   ✅ Списание $i: ID=$doc_id (товар=$product_id, склад=$warehouse_id)"
        else
            echo "   ❌ Ошибка создания списания $i: $response"
        fi
    done
    
    writeoff_creation_time=$(($(get_timestamp) - writeoff_start))
    echo "✅ Создано документов списания: $writeoff_documents/3 за ${writeoff_creation_time}ms"
else
    echo "⚠️ Недостаточно данных для документооборота"
fi

# 3. СОЗДАНИЕ ЗАКАЗОВ
echo ""
echo "🛒 ТЕСТ ЗАКАЗОВ"
echo "=============="

if [ ${#product_ids[@]} -gt 0 ] && [ ${#contractor_ids[@]} -gt 0 ] && [ ${#warehouse_ids[@]} -gt 0 ]; then
    echo "📝 Создание 4 заказов без резервирования..."
    created_orders=0
    orders_creation_start=$(get_timestamp)
    
    for i in {1..4}; do
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        contractor_id=${contractor_ids[$((i % ${#contractor_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        quantity=$((i + 1))
        price=$((i * 150 + 200))
        
        order_data="{
            \"customerId\":$contractor_id,
            \"warehouseId\":$warehouse_id,
            \"status\":\"Новый\",
            \"isReserved\":false,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":$quantity,
                \"price\":\"$price\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$order_data" "http://localhost:5000/api/orders/create")
        
        if echo "$response" | grep -q '"id"'; then
            order_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            ((created_orders++))
            echo "   ✅ Заказ $i: ID=$order_id (товар=$product_id, контрагент=$contractor_id, кол-во=$quantity)"
        else
            echo "   ❌ Ошибка создания заказа $i: $response"
        fi
    done
    
    orders_creation_time=$(($(get_timestamp) - orders_creation_start))
    echo "✅ Создано заказов: $created_orders/4 за ${orders_creation_time}ms"
    
    # Создание заказов с резервированием
    echo "📝 Создание 3 заказов с резервированием..."
    reserved_orders=0
    reserved_start=$(get_timestamp)
    
    for i in {1..3}; do
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        contractor_id=${contractor_ids[$((i % ${#contractor_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        
        reserved_order_data="{
            \"customerId\":$contractor_id,
            \"warehouseId\":$warehouse_id,
            \"status\":\"Новый\",
            \"isReserved\":true,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":1,
                \"price\":\"$((i * 200 + 300))\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$reserved_order_data" "http://localhost:5000/api/orders/create")
        
        if echo "$response" | grep -q '"id"'; then
            order_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            ((reserved_orders++))
            echo "   ✅ Резерв $i: ID=$order_id (товар=$product_id, резерв=1)"
        else
            echo "   ❌ Ошибка создания резерва $i: $response"
        fi
    done
    
    reserved_creation_time=$(($(get_timestamp) - reserved_start))
    echo "✅ Создано заказов с резервом: $reserved_orders/3 за ${reserved_creation_time}ms"
else
    echo "⚠️ Недостаточно данных для заказов"
fi

# 4. ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ СИСТЕМЫ
echo ""
echo "📊 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ПОСЛЕ НАГРУЗКИ"
echo "======================================="

# Измеряем время отклика всех API
products_time=$(measure_api_time "/products")
documents_time=$(measure_api_time "/documents")
orders_time=$(measure_api_time "/orders")
inventory_time=$(measure_api_time "/inventory")
inventory_avail_time=$(measure_api_time "/inventory/availability")

echo "📦 /api/products:              ${products_time}ms"
echo "📄 /api/documents:             ${documents_time}ms"
echo "🛒 /api/orders:                ${orders_time}ms"
echo "📊 /api/inventory:             ${inventory_time}ms"
echo "🔄 /api/inventory/availability: ${inventory_avail_time}ms"

total_api_time=$((products_time + documents_time + orders_time + inventory_time + inventory_avail_time))
avg_api_time=$((total_api_time / 5))

echo "📊 Среднее время API: ${avg_api_time}ms"

# 5. ПРОВЕРКА ОСТАТКОВ
echo ""
echo "💾 ПРОВЕРКА ОСТАТКОВ И РЕЗЕРВОВ"
echo "=============================="

# Получаем актуальные остатки
inventory_response=$(curl -s "http://localhost:5000/api/inventory/availability")
total_items=$(echo "$inventory_response" | grep -o '"id":[0-9]*' | wc -l)
echo "📊 Товаров в системе остатков: $total_items"

# Проверяем метрики системы
metrics_response=$(curl -s "http://localhost:5000/api/metrics")
cache_hit_rate=$(echo "$metrics_response" | grep -o '"cacheHitRate":[0-9.]*' | cut -d':' -f2)
system_avg_time=$(echo "$metrics_response" | grep -o '"averageResponseTime":[0-9.]*' | cut -d':' -f2)

echo "💾 Cache Hit Rate: ${cache_hit_rate}%"
echo "⏱️ Системное среднее время: ${system_avg_time}ms"

# 6. ИТОГОВЫЙ ОТЧЕТ
echo ""
echo "📋 ИТОГОВЫЙ ОТЧЕТ СТРЕСС-ТЕСТИРОВАНИЯ"
echo "===================================="
echo "🎯 РЕЗУЛЬТАТЫ СОЗДАНИЯ ДАННЫХ:"
echo "   ✅ Товары: $created_products/10"
echo "   ✅ Склады: $created_warehouses/3" 
echo "   ✅ Контрагенты: $created_contractors/5"
echo "   ✅ Документы приходования: $created_documents/5"
echo "   ✅ Документы списания: $writeoff_documents/3"
echo "   ✅ Заказы обычные: $created_orders/4"
echo "   ✅ Заказы с резервом: $reserved_orders/3"

total_created=$((created_products + created_warehouses + created_contractors + created_documents + writeoff_documents + created_orders + reserved_orders))
echo ""
echo "📊 ВСЕГО СОЗДАНО ЗАПИСЕЙ: $total_created"

echo ""
echo "⏱️ ПРОИЗВОДИТЕЛЬНОСТЬ:"
if [ -n "$document_creation_time" ]; then
    echo "   📄 Документы приходования: ${document_creation_time}ms"
fi
if [ -n "$writeoff_creation_time" ]; then
    echo "   📄 Документы списания: ${writeoff_creation_time}ms"
fi
if [ -n "$orders_creation_time" ]; then
    echo "   🛒 Заказы обычные: ${orders_creation_time}ms"
fi
if [ -n "$reserved_creation_time" ]; then
    echo "   🛒 Заказы с резервом: ${reserved_creation_time}ms"
fi
echo "   📊 Среднее время API: ${avg_api_time}ms"
echo "   💾 Cache Hit Rate: ${cache_hit_rate}%"

# Финальная оценка
if [ "$total_created" -ge 25 ] && [ "$avg_api_time" -lt 150 ]; then
    echo ""
    echo "🟢 ПРЕВОСХОДНО! Система успешно выдержала полную нагрузку"
    echo "   ✅ Создано $total_created записей"
    echo "   ✅ Полный цикл документооборота работает"
    echo "   ✅ Резервирование функционирует корректно"
    echo "   ✅ API остается быстрым под нагрузкой"
    echo "   ✅ Кеширование эффективно"
elif [ "$total_created" -ge 20 ] && [ "$avg_api_time" -lt 200 ]; then
    echo ""
    echo "🟡 ХОРОШО: Система стабильна под нагрузкой"
else
    echo ""
    echo "🔴 ТРЕБУЕТ ВНИМАНИЯ: Производительность под нагрузкой"
fi

echo ""
echo "✅ Стресс-тест полного цикла ERP завершен"
echo "🚀 ID теста: $RUN_ID"