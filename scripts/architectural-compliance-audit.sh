#!/bin/bash

# 🔍 Комплексная проверка соответствия архитектурным стандартам
# На основе docs/ENTERPRISE_ARCHITECTURE.md, docs/NAMING_GUIDE.md и других руководств

echo "🏗️ АРХИТЕКТУРНЫЙ АУДИТ ERP СИСТЕМЫ - $(date)"
echo "========================================================"

VIOLATIONS=0
TOTAL_CHECKS=0

# Функция для подсчета нарушений
count_violation() {
    local count=$1
    local description="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ $count -gt 0 ]; then
        VIOLATIONS=$((VIOLATIONS + count))
        echo "❌ $description: $count нарушений"
        return $count
    else
        echo "✅ $description: соответствует стандартам"
        return 0
    fi
}

echo ""
echo "📍 1. ПРОВЕРКА API МАРШРУТОВ (shared/apiRoutes.ts)"
echo "----------------------------------------------------"

# Проверка хардкодных API маршрутов в клиентском коде
HARDCODED_API=$(grep -r '"/api/' client/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "API_ROUTES" | wc -l || echo 0)
count_violation $HARDCODED_API "Хардкодные API маршруты в клиенте"

# Проверка хардкодных API маршрутов в hooks
HARDCODED_HOOKS=$(grep -r '"/api/' hooks/ --include="*.ts" 2>/dev/null | grep -v "API_ROUTES" | wc -l || echo 0)
count_violation $HARDCODED_HOOKS "Хардкодные API маршруты в hooks"

# Проверка хардкодных API маршрутов в серверных маршрутах
HARDCODED_SERVER=$(grep -r '"/api/' server/routes/ --include="*.ts" 2>/dev/null | grep -v "API_ROUTES" | wc -l || echo 0)
count_violation $HARDCODED_SERVER "Хардкодные API маршруты в server/routes"

echo ""
echo "🔧 2. ПРОВЕРКА ЦЕНТРАЛИЗОВАННОЙ ВАЛИДАЦИИ (shared/zFields.ts)"
echo "-------------------------------------------------------------"

# Проверка ручной валидации вместо zFields
MANUAL_VALIDATION=$(grep -r 'z\.string()\.min\|z\.number()\.positive\|z\.coerce\.number()\.min' shared/ server/ 2>/dev/null | grep -v "zFields.ts" | wc -l || echo 0)
count_violation $MANUAL_VALIDATION "Ручная валидация вместо zFields"

# Проверка использования z.string() без zName
MANUAL_STRING=$(grep -r 'z\.string()' shared/schema.ts 2>/dev/null | grep -v "zName\|zPassword\|zBarcode" | wc -l || echo 0)
count_violation $MANUAL_STRING "Использование z.string() вместо zName"

echo ""
echo "⚙️ 3. ПРОВЕРКА STATIC МЕТОДОВ В СЕРВИСАХ"
echo "----------------------------------------"

# Проверка не-static методов в сервисах
NON_STATIC_METHODS=$(grep -r 'async [a-zA-Z].*(' server/services/ --include="*.ts" 2>/dev/null | grep -v "static\|constructor\|private\|protected" | wc -l || echo 0)
count_violation $NON_STATIC_METHODS "Не-static методы в сервисах"

# Проверка экземпляров сервисов
SERVICE_INSTANCES=$(grep -r 'new.*Service(' server/ client/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)
count_violation $SERVICE_INSTANCES "Создание экземпляров сервисов"

echo ""
echo "🚨 4. ПРОВЕРКА ОБРАБОТКИ ОШИБОК"
echo "-------------------------------"

# Проверка catch блоков без throw error
MISSING_THROW=$(grep -A 5 'catch.*{' server/services/ --include="*.ts" 2>/dev/null | grep -B 5 'console.log\|return null\|return false\|return undefined' | grep -c "catch" || echo 0)
count_violation $MISSING_THROW "Catch блоки без throw error"

# Проверка использования console.* вместо logger
CONSOLE_USAGE=$(grep -r 'console\.' server/ --include="*.ts" 2>/dev/null | grep -v "logger" | wc -l || echo 0)
count_violation $CONSOLE_USAGE "Использование console.* вместо logger"

echo ""
echo "📝 5. ПРОВЕРКА ТИПИЗАЦИИ"
echo "------------------------"

# Проверка использования типа any
ANY_USAGE=$(grep -r ': any\|<any>\|as any' server/ client/ shared/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// @ts-ignore\|eslint-disable" | wc -l || echo 0)
count_violation $ANY_USAGE "Использование типа any"

# Проверка @ts-ignore
TS_IGNORE=$(grep -r '@ts-ignore' server/ client/ shared/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)
count_violation $TS_IGNORE "Использование @ts-ignore"

echo ""
echo "🏷️ 6. ПРОВЕРКА СТАНДАРТОВ ИМЕНОВАНИЯ"
echo "------------------------------------"

# Проверка snake_case в API интерфейсах (должен быть camelCase)
SNAKE_IN_API=$(grep -r 'interface.*{' shared/ client/ --include="*.ts" 2>/dev/null -A 20 | grep -E '[a-z_]+:' | grep '_' | wc -l || echo 0)
count_violation $SNAKE_IN_API "snake_case в API интерфейсах"

# Проверка camelCase в SQL схемах (должен быть snake_case)  
CAMEL_IN_SQL=$(grep -r 'varchar\|integer\|decimal\|boolean' shared/schema.ts 2>/dev/null | grep -E '[a-z][A-Z]' | wc -l || echo 0)
count_violation $CAMEL_IN_SQL "camelCase в SQL схемах"

# Проверка булевых полей без префиксов is/has/can
BOOLEAN_NO_PREFIX=$(grep -r ': boolean' shared/ --include="*.ts" 2>/dev/null | grep -v -E '(is|has|can)[A-Z]' | wc -l || echo 0)
count_violation $BOOLEAN_NO_PREFIX "Булевы поля без префиксов is/has/can"

echo ""
echo "🧪 7. ПРОВЕРКА ТЕСТОВОГО ПОКРЫТИЯ"
echo "---------------------------------"

# Проверка наличия тестов для сервисов
SERVICES_COUNT=$(find server/services/ -name "*.ts" 2>/dev/null | grep -v ".test.ts" | wc -l || echo 0)
TESTS_COUNT=$(find tests/ -name "*service*.test.ts" 2>/dev/null | wc -l || echo 0)
MISSING_TESTS=$((SERVICES_COUNT > TESTS_COUNT ? SERVICES_COUNT - TESTS_COUNT : 0))
count_violation $MISSING_TESTS "Сервисы без тестов"

echo ""
echo "⚡ 8. ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ"
echo "--------------------------------"

# Проверка React компонентов без мемоизации
UNMEMOIZED_COMPONENTS=$(grep -r 'const.*= .*{' client/src/ --include="*.tsx" 2>/dev/null | grep -v "React.memo\|useMemo\|useCallback" | wc -l || echo 0)
count_violation $UNMEMOIZED_COMPONENTS "React компоненты без мемоизации"

echo ""
echo "🔒 9. ПРОВЕРКА БЕЗОПАСНОСТИ"
echo "---------------------------"

# Проверка API endpoints без валидации
ROUTES_COUNT=$(grep -r 'router\.\(get\|post\|put\|delete\)' server/routes/ --include="*.ts" 2>/dev/null | wc -l || echo 0)
VALIDATED_ROUTES=$(grep -r 'validateSchema\|validation' server/routes/ --include="*.ts" 2>/dev/null | wc -l || echo 0)
UNVALIDATED_ROUTES=$((ROUTES_COUNT > VALIDATED_ROUTES ? ROUTES_COUNT - VALIDATED_ROUTES : 0))
count_violation $UNVALIDATED_ROUTES "API endpoints без валидации"

echo ""
echo "📊 10. ПРОВЕРКА ДОКУМЕНТАЦИИ"
echo "----------------------------"

# Проверка наличия всех обязательных документов
REQUIRED_DOCS=("docs/ENTERPRISE_ARCHITECTURE.md" "docs/DEVELOPMENT_STANDARDS.md" "docs/CODE_REVIEW_GUIDE.md" "docs/SECURITY_PERFORMANCE_GUIDE.md" "docs/NAMING_GUIDE.md" "docs/README.md")
MISSING_DOCS=0

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        MISSING_DOCS=$((MISSING_DOCS + 1))
        echo "❌ Отсутствует документ: $doc"
    fi
done

count_violation $MISSING_DOCS "Отсутствующие документы"

echo ""
echo "========================================================"
echo "📈 ИТОГОВАЯ СТАТИСТИКА АУДИТА"
echo "========================================================"

if [ $TOTAL_CHECKS -gt 0 ]; then
    COMPLIANCE_RATE=$(echo "scale=2; (($TOTAL_CHECKS - $VIOLATIONS) * 100) / $TOTAL_CHECKS" | bc -l 2>/dev/null || echo "0")
else
    COMPLIANCE_RATE="100"
fi

echo "Общее количество проверок: $TOTAL_CHECKS"
echo "Обнаруженные нарушения: $VIOLATIONS"
echo "Уровень соответствия: ${COMPLIANCE_RATE}%"

if [ $VIOLATIONS -eq 0 ]; then
    echo ""
    echo "🎉 ОТЛИЧНО! Система полностью соответствует архитектурным стандартам"
    echo "✅ Все проверки пройдены успешно"
    exit 0
elif [ $VIOLATIONS -le 5 ]; then
    echo ""
    echo "⚠️ ХОРОШО. Обнаружены незначительные нарушения"
    echo "💡 Рекомендуется устранить найденные проблемы"
    exit 1
elif [ $VIOLATIONS -le 15 ]; then
    echo ""
    echo "🔧 ТРЕБУЕТСЯ УЛУЧШЕНИЕ. Обнаружены существенные нарушения"
    echo "⚠️ Необходимо провести рефакторинг для соответствия стандартам"
    exit 2
else
    echo ""
    echo "🚨 КРИТИЧЕСКИ. Система значительно отклоняется от стандартов"
    echo "❌ Требуется масштабный рефакторинг архитектуры"
    exit 3
fi