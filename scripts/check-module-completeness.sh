#!/bin/bash

# 🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА ПОЛНОТЫ МОДУЛЯ
# 
# Проверяет все компоненты модуля согласно MODULE_IMPLEMENTATION_RULES.md

MODULE_NAME=${1:-"shipments"}
MODULE_CAPITAL=$(echo "${MODULE_NAME^}")
MISSING_COUNT=0
TOTAL_CHECKS=0

echo "🔍 Проверка полноты модуля: $MODULE_NAME"
echo "========================================"

# 1. BACKEND АРХИТЕКТУРА
echo ""
echo "📦 BACKEND АРХИТЕКТУРА:"

# IStorage методы
((TOTAL_CHECKS++))
if grep -q "get${MODULE_CAPITAL}" server/storage.ts; then
    echo "✅ IStorage методы в server/storage.ts"
else
    echo "❌ ОТСУТСТВУЮТ: IStorage методы в server/storage.ts"
    ((MISSING_COUNT++))
fi

# Маршруты
((TOTAL_CHECKS++))
if [ -f "server/routes/${MODULE_NAME}Routes.ts" ]; then
    echo "✅ server/routes/${MODULE_NAME}Routes.ts"
else
    echo "❌ ОТСУТСТВУЕТ: server/routes/${MODULE_NAME}Routes.ts"
    ((MISSING_COUNT++))
fi

# Сервис
((TOTAL_CHECKS++))
if [ -f "server/services/${MODULE_NAME}Service.ts" ]; then
    echo "✅ server/services/${MODULE_NAME}Service.ts"
else
    echo "❌ ОТСУТСТВУЕТ: server/services/${MODULE_NAME}Service.ts"
    ((MISSING_COUNT++))
fi

# Схемы в shared/schema.ts
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" shared/schema.ts; then
    echo "✅ Схемы в shared/schema.ts"
else
    echo "❌ ОТСУТСТВУЮТ: Схемы в shared/schema.ts"
    ((MISSING_COUNT++))
fi

# API маршруты
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME^^}" shared/apiRoutes.ts; then
    echo "✅ API маршруты в shared/apiRoutes.ts"
else
    echo "❌ ОТСУТСТВУЮТ: API маршруты в shared/apiRoutes.ts"
    ((MISSING_COUNT++))
fi

# 2. FRONTEND АРХИТЕКТУРА
echo ""
echo "🎨 FRONTEND АРХИТЕКТУРА:"

# Страница списка
((TOTAL_CHECKS++))
if [ -f "client/src/pages/${MODULE_CAPITAL}List.tsx" ]; then
    echo "✅ client/src/pages/${MODULE_CAPITAL}List.tsx"
else
    echo "❌ ОТСУТСТВУЕТ: client/src/pages/${MODULE_CAPITAL}List.tsx"
    ((MISSING_COUNT++))
fi

# Компонент формы
((TOTAL_CHECKS++))
if [ -f "client/src/components/${MODULE_CAPITAL}.tsx" ]; then
    echo "✅ client/src/components/${MODULE_CAPITAL}.tsx"
else
    echo "❌ ОТСУТСТВУЕТ: client/src/components/${MODULE_CAPITAL}.tsx"
    ((MISSING_COUNT++))
fi

# API хуки
((TOTAL_CHECKS++))
if [ -f "client/src/hooks/api/use${MODULE_CAPITAL}.ts" ]; then
    echo "✅ client/src/hooks/api/use${MODULE_CAPITAL}.ts"
else
    echo "❌ ОТСУТСТВУЕТ: client/src/hooks/api/use${MODULE_CAPITAL}.ts"
    ((MISSING_COUNT++))
fi

# Маршрут в App.tsx
((TOTAL_CHECKS++))
if grep -q "/${MODULE_NAME}" client/src/App.tsx; then
    echo "✅ Маршрут в client/src/App.tsx"
else
    echo "❌ ОТСУТСТВУЕТ: Маршрут в client/src/App.tsx"
    ((MISSING_COUNT++))
fi

# Навигация
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" client/src/components/Navigation.tsx; then
    echo "✅ Навигация в client/src/components/Navigation.tsx"
else
    echo "❌ ОТСУТСТВУЕТ: Навигация в client/src/components/Navigation.tsx"
    ((MISSING_COUNT++))
fi

# 3. СИСТЕМА ТЕСТИРОВАНИЯ (КРИТИЧНО!)
echo ""
echo "🧪 СИСТЕМА ТЕСТИРОВАНИЯ:"

# Unit тесты сервиса
((TOTAL_CHECKS++))
if [ -f "tests/services/${MODULE_NAME}Service.test.ts" ]; then
    echo "✅ tests/services/${MODULE_NAME}Service.test.ts"
else
    echo "❌ ОТСУТСТВУЕТ: tests/services/${MODULE_NAME}Service.test.ts"
    ((MISSING_COUNT++))
fi

# Интеграционные тесты
((TOTAL_CHECKS++))
if [ -f "tests/integration/${MODULE_NAME}Integration.test.ts" ]; then
    echo "✅ tests/integration/${MODULE_NAME}Integration.test.ts"
else
    echo "❌ ОТСУТСТВУЕТ: tests/integration/${MODULE_NAME}Integration.test.ts"
    ((MISSING_COUNT++))
fi

# Тесты валидации
((TOTAL_CHECKS++))
if [ -f "tests/validation/${MODULE_NAME}Validation.test.ts" ]; then
    echo "✅ tests/validation/${MODULE_NAME}Validation.test.ts"
else
    echo "❌ ОТСУТСТВУЕТ: tests/validation/${MODULE_NAME}Validation.test.ts"
    ((MISSING_COUNT++))
fi

# API маршруты в тестах
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" tests/api-routing.test.ts; then
    echo "✅ Тест API маршрутов в tests/api-routing.test.ts"
else
    echo "❌ ОТСУТСТВУЕТ: Тест API маршрутов в tests/api-routing.test.ts"
    ((MISSING_COUNT++))
fi

# 4. КЕШИРОВАНИЕ И ПРОИЗВОДИТЕЛЬНОСТЬ
echo ""
echo "⚡ КЕШИРОВАНИЕ И ПРОИЗВОДИТЕЛЬНОСТЬ:"

# Кеширование маршрутов
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" server/routes/${MODULE_NAME}Routes.ts 2>/dev/null && grep -q "Cache\|cache" server/routes/${MODULE_NAME}Routes.ts; then
    echo "✅ Кеширование в server/routes/${MODULE_NAME}Routes.ts"
else
    echo "❌ ОТСУТСТВУЕТ: Кеширование в server/routes/${MODULE_NAME}Routes.ts"
    ((MISSING_COUNT++))
fi

# Разогрев кеша
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" server/services/cacheWarmupService.ts; then
    echo "✅ Разогрев кеша в server/services/cacheWarmupService.ts"
else
    echo "❌ ОТСУТСТВУЕТ: Разогрев кеша в server/services/cacheWarmupService.ts"
    ((MISSING_COUNT++))
fi

# 5. ВАЛИДАЦИЯ И БЕЗОПАСНОСТЬ
echo ""
echo "🔒 ВАЛИДАЦИЯ И БЕЗОПАСНОСТЬ:"

# Валидация полей
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" shared/zFields.ts; then
    echo "✅ Поля валидации в shared/zFields.ts"
else
    echo "❌ ОТСУТСТВУЮТ: Поля валидации в shared/zFields.ts"
    ((MISSING_COUNT++))
fi

# Middleware валидации
((TOTAL_CHECKS++))
if grep -q "${MODULE_NAME}" server/middleware/validation.ts; then
    echo "✅ Middleware валидации в server/middleware/validation.ts"
else
    echo "❌ ОТСУТСТВУЕТ: Middleware валидации в server/middleware/validation.ts"
    ((MISSING_COUNT++))
fi

# ИТОГОВАЯ СТАТИСТИКА
echo ""
echo "========================================"
echo "📊 ИТОГОВАЯ СТАТИСТИКА:"
echo "Всего проверок: $TOTAL_CHECKS"
echo "Выполнено: $((TOTAL_CHECKS - MISSING_COUNT))"
echo "Отсутствует: $MISSING_COUNT"

COMPLETION_RATE=$((100 * (TOTAL_CHECKS - MISSING_COUNT) / TOTAL_CHECKS))
echo "Завершенность: $COMPLETION_RATE%"

if [ $MISSING_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 МОДУЛЬ $MODULE_NAME ПОЛНОСТЬЮ ГОТОВ!"
    echo "Все компоненты реализованы согласно стандартам."
    exit 0
else
    echo ""
    echo "⚠️  МОДУЛЬ $MODULE_NAME НЕ ЗАВЕРШЕН!"
    echo "Необходимо исправить $MISSING_COUNT проблем(ы)."
    echo ""
    echo "📖 Смотрите docs/MODULE_IMPLEMENTATION_RULES.md для деталей."
    exit 1
fi