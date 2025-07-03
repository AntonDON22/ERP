#!/bin/bash

# 🚀 КОМПЛЕКСНЫЙ СТРЕСС-ТЕСТ ERP СИСТЕМЫ
# Создает массовые данные для всех модулей системы

echo "🎯 ЗАПУСК КОМПЛЕКСНОГО СТРЕСС-ТЕСТА ERP СИСТЕМЫ"
echo "=================================================="

BASE_URL="http://localhost:5000/api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Функция для отправки POST запросов
send_post() {
    local endpoint="$1"
    local data="$2"
    local description="$3"
    
    echo "📤 Создание: $description"
    response=$(curl -s -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Успешно: $description"
        return 0
    else
        echo "❌ Ошибка: $description - $response"
        return 1
    fi
}

# Счетчики
SUCCESS_COUNT=0
ERROR_COUNT=0

echo ""
echo "🏢 СОЗДАНИЕ ПОСТАВЩИКОВ (50 шт)"
echo "=============================="

for i in {1..50}; do
    name="СтрессПоставщик$i"
    website="https://supplier$i.com"
    
    data="{\"name\": \"$name\", \"website\": \"$website\"}"
    
    if send_post "/suppliers" "$data" "Поставщик $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "🤝 СОЗДАНИЕ КОНТРАГЕНТОВ (50 шт)"
echo "=============================="

for i in {1..50}; do
    name="СтрессКонтрагент$i"
    website="https://contractor$i.com"
    
    data="{\"name\": \"$name\", \"website\": \"$website\"}"
    
    if send_post "/contractors" "$data" "Контрагент $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "🏬 СОЗДАНИЕ СКЛАДОВ (25 шт)"
echo "========================="

for i in {1..25}; do
    name="СтрессСклад$i"
    address="ул. Складская $i, г. Москва"
    
    data="{\"name\": \"$name\", \"address\": \"$address\"}"
    
    if send_post "/warehouses" "$data" "Склад $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "📦 СОЗДАНИЕ ТОВАРОВ (100 шт)"
echo "==========================="

for i in {1..100}; do
    name="СтрессТовар$i"
    sku="STRESS$(printf "%03d" $i)"
    price=$((RANDOM % 1000 + 100))
    weight=$((RANDOM % 50 + 1))
    
    data="{\"name\": \"$name\", \"sku\": \"$sku\", \"price\": $price, \"weight\": $weight}"
    
    if send_post "/products" "$data" "Товар $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "📋 СОЗДАНИЕ ДОКУМЕНТОВ ОПРИХОДОВАНИЯ (30 шт)"
echo "=========================================="

for i in {1..30}; do
    warehouse_id=$((RANDOM % 25 + 1))
    product_id=$((RANDOM % 100 + 1))
    quantity=$((RANDOM % 100 + 10))
    price=$((RANDOM % 500 + 50))
    
    data="{
        \"type\": \"Оприходование\",
        \"warehouseId\": $warehouse_id,
        \"items\": [
            {
                \"productId\": $product_id,
                \"quantity\": $quantity,
                \"price\": $price
            }
        ]
    }"
    
    if send_post "/documents/create" "$data" "Документ оприходования $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "🛒 СОЗДАНИЕ ЗАКАЗОВ (40 шт)"
echo "========================="

for i in {1..40}; do
    contractor_id=$((RANDOM % 50 + 1))
    product_id=$((RANDOM % 100 + 1))
    quantity=$((RANDOM % 20 + 1))
    price=$((RANDOM % 800 + 100))
    
    # Случайное резервирование (50% вероятность)
    if [ $((RANDOM % 2)) -eq 0 ]; then
        is_reserved="true"
    else
        is_reserved="false"
    fi
    
    data="{
        \"customerId\": $contractor_id,
        \"isReserved\": $is_reserved,
        \"items\": [
            {
                \"productId\": $product_id,
                \"quantity\": $quantity,
                \"price\": $price
            }
        ]
    }"
    
    if send_post "/orders/create" "$data" "Заказ $i (резерв: $is_reserved)"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "📊 СОЗДАНИЕ ДОКУМЕНТОВ СПИСАНИЯ (20 шт)"
echo "====================================="

for i in {1..20}; do
    warehouse_id=$((RANDOM % 25 + 1))
    product_id=$((RANDOM % 100 + 1))
    quantity=$((RANDOM % 10 + 1))
    
    data="{
        \"type\": \"Списание\",
        \"warehouseId\": $warehouse_id,
        \"items\": [
            {
                \"productId\": $product_id,
                \"quantity\": $quantity
            }
        ]
    }"
    
    if send_post "/documents/create" "$data" "Документ списания $i"; then
        ((SUCCESS_COUNT++))
    else
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "🎯 ИТОГОВАЯ СТАТИСТИКА СТРЕСС-ТЕСТА"
echo "================================="
echo "✅ Успешно создано: $SUCCESS_COUNT записей"
echo "❌ Ошибок: $ERROR_COUNT"
echo "📊 Общее количество: $((SUCCESS_COUNT + ERROR_COUNT))"
echo "🎯 Процент успеха: $(( SUCCESS_COUNT * 100 / (SUCCESS_COUNT + ERROR_COUNT) ))%"

# Проверка производительности API
echo ""
echo "⚡ ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ API"
echo "==============================="

echo "📦 Товары:"
time curl -s "$BASE_URL/products" | jq '. | length'

echo "🏢 Поставщики:"
time curl -s "$BASE_URL/suppliers" | jq '. | length'

echo "🤝 Контрагенты:"
time curl -s "$BASE_URL/contractors" | jq '. | length'

echo "🏬 Склады:"
time curl -s "$BASE_URL/warehouses" | jq '. | length'

echo "📋 Документы:"
time curl -s "$BASE_URL/documents" | jq '. | length'

echo "🛒 Заказы:"
time curl -s "$BASE_URL/orders" | jq '. | length'

echo "📊 Остатки:"
time curl -s "$BASE_URL/inventory" | jq '. | length'

echo ""
echo "🎉 СТРЕСС-ТЕСТ ЗАВЕРШЕН!"
echo "======================"
echo "Timestamp: $TIMESTAMP"
echo "Проверьте веб-интерфейс для подтверждения результатов"