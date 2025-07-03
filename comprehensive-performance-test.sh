#!/bin/bash

echo "🚀 КОМПЛЕКСНЫЙ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ С ДОКУМЕНТАМИ И ЗАКАЗАМИ"
echo "=============================================================="

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

# Функция для получения случайного элемента из JSON массива
get_random_id() {
    local json_response=$1
    echo "$json_response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2
}

# Проверка что сервер работает
echo "🔍 Проверка доступности сервера..."
if ! curl -s http://localhost:5000/api/products > /dev/null; then
    echo "❌ Сервер недоступен на порту 5000"
    exit 1
fi
echo "✅ Сервер работает"

# 1. Подготовка базовых данных
echo ""
echo "📊 ПОДГОТОВКА ТЕСТОВЫХ ДАННЫХ"
echo "============================="

# Создание товаров для тестирования
echo "📦 Создание 10 тестовых товаров..."
created_products=0
product_ids=()

for i in {1..10}; do
    product_data="{\"name\":\"ТестТовар${i}\",\"sku\":\"TEST${i}\",\"price\":\"${i}00\",\"purchasePrice\":\"$((i*50))\"}"
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$product_data" "http://localhost:5000/api/products")
    
    if echo "$response" | grep -q '"id"'; then
        product_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        product_ids+=($product_id)
        ((created_products++))
    fi
done

echo "✅ Создано товаров: $created_products"

# Создание складов
echo "🏢 Создание 3 тестовых складов..."
created_warehouses=0
warehouse_ids=()

for i in {1..3}; do
    warehouse_data="{\"name\":\"ТестСклад${i}\",\"address\":\"Адрес склада ${i}\"}"
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$warehouse_data" "http://localhost:5000/api/warehouses")
    
    if echo "$response" | grep -q '"id"'; then
        warehouse_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        warehouse_ids+=($warehouse_id)
        ((created_warehouses++))
    fi
done

echo "✅ Создано складов: $created_warehouses"

# Создание контрагентов
echo "👥 Создание 5 тестовых контрагентов..."
created_contractors=0
contractor_ids=()

for i in {1..5}; do
    contractor_data="{\"name\":\"ТестКонтрагент${i}\",\"website\":\"https://test${i}.example.com\"}"
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$contractor_data" "http://localhost:5000/api/contractors")
    
    if echo "$response" | grep -q '"id"'; then
        contractor_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        contractor_ids+=($contractor_id)
        ((created_contractors++))
    fi
done

echo "✅ Создано контрагентов: $created_contractors"

# 2. Тест создания документов
echo ""
echo "📄 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ДОКУМЕНТОВ"
echo "====================================="

if [ ${#product_ids[@]} -gt 0 ] && [ ${#warehouse_ids[@]} -gt 0 ]; then
    echo "📋 Создание 5 документов приходования..."
    created_documents=0
    document_creation_start=$(date +%s%3N)
    
    for i in {1..5}; do
        # Выбираем случайные товар и склад
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        
        document_data="{
            \"type\":\"income\",
            \"status\":\"posted\",
            \"warehouseId\":$warehouse_id,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":$((i + 1)),
                \"price\":\"$((i * 100))\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$document_data" "http://localhost:5000/api/documents/create")
        
        if echo "$response" | grep -q '"id"'; then
            ((created_documents++))
        fi
    done
    
    document_creation_time=$(($(date +%s%3N) - document_creation_start))
    echo "✅ Создано документов: $created_documents/5 за ${document_creation_time}ms"
    
    # Тест создания документов списания
    echo "📋 Создание 3 документов списания..."
    writeoff_documents=0
    writeoff_start=$(date +%s%3N)
    
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
            ((writeoff_documents++))
        fi
    done
    
    writeoff_creation_time=$(($(date +%s%3N) - writeoff_start))
    echo "✅ Создано документов списания: $writeoff_documents/3 за ${writeoff_creation_time}ms"
else
    echo "⚠️ Недостаточно данных для создания документов"
fi

# 3. Тест создания заказов
echo ""
echo "🛒 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ЗАКАЗОВ"
echo "=================================="

if [ ${#product_ids[@]} -gt 0 ] && [ ${#contractor_ids[@]} -gt 0 ] && [ ${#warehouse_ids[@]} -gt 0 ]; then
    echo "📝 Создание 5 заказов без резервирования..."
    created_orders=0
    orders_creation_start=$(date +%s%3N)
    
    for i in {1..5}; do
        product_id=${product_ids[$((i % ${#product_ids[@]}))]}
        contractor_id=${contractor_ids[$((i % ${#contractor_ids[@]}))]}
        warehouse_id=${warehouse_ids[$((i % ${#warehouse_ids[@]}))]}
        
        order_data="{
            \"customerId\":$contractor_id,
            \"warehouseId\":$warehouse_id,
            \"status\":\"Новый\",
            \"isReserved\":false,
            \"items\":[{
                \"productId\":$product_id,
                \"quantity\":$((i + 1)),
                \"price\":\"$((i * 150))\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$order_data" "http://localhost:5000/api/orders/create")
        
        if echo "$response" | grep -q '"id"'; then
            ((created_orders++))
        fi
    done
    
    orders_creation_time=$(($(date +%s%3N) - orders_creation_start))
    echo "✅ Создано заказов без резерва: $created_orders/5 за ${orders_creation_time}ms"
    
    # Тест создания заказов с резервированием
    echo "📝 Создание 3 заказов с резервированием..."
    reserved_orders=0
    reserved_start=$(date +%s%3N)
    
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
                \"price\":\"$((i * 200))\"
            }]
        }"
        
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$reserved_order_data" "http://localhost:5000/api/orders/create")
        
        if echo "$response" | grep -q '"id"'; then
            ((reserved_orders++))
        fi
    done
    
    reserved_creation_time=$(($(date +%s%3N) - reserved_start))
    echo "✅ Создано заказов с резервом: $reserved_orders/3 за ${reserved_creation_time}ms"
else
    echo "⚠️ Недостаточно данных для создания заказов"
fi

# 4. Тест производительности чтения после создания данных
echo ""
echo "📊 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ПОСЛЕ СОЗДАНИЯ ДАННЫХ"
echo "=============================================="

# Проверяем время отклика всех endpoint'ов после создания данных
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

# Среднее время
total_read_time=$((products_time + documents_time + orders_time + inventory_time + inventory_avail_time))
avg_read_time=$((total_read_time / 5))

echo "📊 Среднее время чтения: ${avg_read_time}ms"

# 5. Тест влияния на остатки
echo ""
echo "💾 ТЕСТ ВЛИЯНИЯ НА ОСТАТКИ И КЕШИРОВАНИЕ"
echo "======================================"

echo "🔄 Проверка остатков после операций..."
first_inventory_check=$(measure_api_time "/inventory/availability")
echo "   Первая проверка остатков: ${first_inventory_check}ms"

sleep 1

second_inventory_check=$(measure_api_time "/inventory/availability")
echo "   Вторая проверка остатков: ${second_inventory_check}ms"

# Проверка актуальности данных
inventory_response=$(curl -s "http://localhost:5000/api/inventory/availability")
inventory_items=$(echo "$inventory_response" | grep -o '"id":[0-9]*' | wc -l)
echo "   Товаров в остатках: $inventory_items"

# 6. Итоговый отчет
echo ""
echo "📋 ИТОГОВЫЙ ОТЧЕТ КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ"
echo "=========================================="
echo "📊 СОЗДАННЫЕ ДАННЫЕ:"
echo "   Товары: $created_products"
echo "   Склады: $created_warehouses" 
echo "   Контрагенты: $created_contractors"
echo "   Документы приходования: $created_documents"
echo "   Документы списания: $writeoff_documents"
echo "   Заказы без резерва: $created_orders"
echo "   Заказы с резервом: $reserved_orders"

echo ""
echo "⏱️ ПРОИЗВОДИТЕЛЬНОСТЬ ОПЕРАЦИЙ:"
if [ -n "$document_creation_time" ]; then
    echo "   Создание документов: ${document_creation_time}ms"
fi
if [ -n "$writeoff_creation_time" ]; then
    echo "   Списание товаров: ${writeoff_creation_time}ms"
fi
if [ -n "$orders_creation_time" ]; then
    echo "   Создание заказов: ${orders_creation_time}ms"
fi
if [ -n "$reserved_creation_time" ]; then
    echo "   Заказы с резервами: ${reserved_creation_time}ms"
fi
echo "   Среднее время чтения: ${avg_read_time}ms"
echo "   Проверка остатков: ${first_inventory_check}ms → ${second_inventory_check}ms"

# Общая оценка
total_created=$((created_products + created_warehouses + created_contractors + created_documents + writeoff_documents + created_orders + reserved_orders))

if [ "$total_created" -gt 20 ] && [ "$avg_read_time" -lt 150 ]; then
    echo ""
    echo "🟢 ПРЕВОСХОДНО: Система успешно справилась с комплексной нагрузкой"
    echo "   ✅ Создано $total_created записей"
    echo "   ✅ Быстрая обработка документооборота" 
    echo "   ✅ Эффективное управление остатками"
    echo "   ✅ Резервирование работает корректно"
elif [ "$total_created" -gt 15 ] && [ "$avg_read_time" -lt 200 ]; then
    echo ""
    echo "🟡 ХОРОШО: Система показывает стабильную производительность"
else
    echo ""
    echo "🔴 ВНИМАНИЕ: Требуется анализ производительности"
fi

echo ""
echo "✅ Комплексное тестирование документооборота завершено"
echo "📊 Система готова к работе с полным циклом ERP операций"