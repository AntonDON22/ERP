#!/bin/bash

# Скрипт для полной проверки исправлений OrderService
echo "🔍 ПРОВЕРКА ИСПРАВЛЕНИЙ ORDERSERVICE"
echo "====================================="

# 1. Проверка что есть throw error во всех catch блоках
echo "1. Проверка catch блоков с throw error:"
CATCH_COUNT=$(grep -c "catch (error)" server/services/orderService.ts)
THROW_COUNT=$(grep -c "throw error" server/services/orderService.ts)

echo "   Найдено catch блоков: $CATCH_COUNT"
echo "   Найдено throw error: $THROW_COUNT"

if [ "$CATCH_COUNT" = "$THROW_COUNT" ]; then
    echo "   ✅ Все catch блоки содержат throw error"
else
    echo "   ❌ ПРОБЛЕМА: Не все catch блоки содержат throw error"
    echo "   Проблемные catch блоки:"
    grep -n -A 8 "catch (error)" server/services/orderService.ts | grep -v "throw error" | head -20
fi

# 2. Проверка что нет дублирования методов
echo ""
echo "2. Проверка дублирования методов:"
DELETE_METHODS=$(grep -c "async delete" server/services/orderService.ts)
echo "   Найдено методов delete: $DELETE_METHODS"

if [ "$DELETE_METHODS" = "2" ]; then
    echo "   ✅ Корректное количество методов (delete + deleteMultiple)"
else
    echo "   ❌ ПРОБЛЕМА: Неправильное количество методов delete"
fi

# 3. Проверка что в update() есть проверка существования
echo ""
echo "3. Проверка проверки существования в update():"
if grep -A 10 "static async update" server/services/orderService.ts | grep -q "storage.getOrder(id)"; then
    echo "   ✅ Проверка существования в update() найдена"
else
    echo "   ❌ ПРОБЛЕМА: Отсутствует проверка существования в update()"
fi

# 4. Тест API endpoints
echo ""
echo "4. Тестирование API endpoints:"

# Тест удаления несуществующего заказа
echo "   Тестирую DELETE несуществующего заказа..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:5000/api/orders/99999)
if [ "$RESPONSE" = "500" ] || [ "$RESPONSE" = "404" ]; then
    echo "   ✅ DELETE несуществующего заказа возвращает ошибку ($RESPONSE)"
else
    echo "   ❌ ПРОБЛЕМА: DELETE несуществующего заказа вернул код $RESPONSE"
fi

echo ""
echo "🏁 ПРОВЕРКА ЗАВЕРШЕНА"