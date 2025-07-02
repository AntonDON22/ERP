#!/bin/bash

echo "🚀 Запуск системного теста адаптивности ERP..."
echo ""

# Определяем корень проекта (ищем package.json)
PROJECT_ROOT=""
if [ -f "package.json" ]; then
    PROJECT_ROOT="."
elif [ -f "../package.json" ]; then
    PROJECT_ROOT=".."
elif [ -f "../../package.json" ]; then
    PROJECT_ROOT="../.."
else
    echo "❌ Не удалось найти корень проекта (package.json)"
    exit 1
fi

echo "📂 Корень проекта: $PROJECT_ROOT"
echo ""

# Результаты тестирования
CRITICAL_ISSUES=0
WARNING_ISSUES=0
STYLELINT_ISSUES=0

# Функция для проверки файлов
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo "✅ $description: найден"
        return 0
    else
        echo "❌ $description: НЕ НАЙДЕН"
        ((CRITICAL_ISSUES++))
        return 1
    fi
}

# Функция для проверки содержимого файла
check_content() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    local severity="$4"
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo "✅ $description: OK"
        return 0
    else
        echo "⚠️ $description: НЕ НАЙДЕНО"
        if [ "$severity" = "critical" ]; then
            ((CRITICAL_ISSUES++))
        else
            ((WARNING_ISSUES++))
        fi
        return 1
    fi
}

echo "🔍 Проверка адаптивных компонентов..."

# Проверка существования ключевых файлов 
check_file "$PROJECT_ROOT/client/src/components/DataTable.tsx" "DataTable компонент"
check_file "$PROJECT_ROOT/client/src/components/Navigation.tsx" "Navigation компонент"  
check_file "$PROJECT_ROOT/client/src/pages/ResponsiveTest.tsx" "Страница тестирования адаптивности"
check_file "$PROJECT_ROOT/.stylelintrc.json" "Конфигурация Stylelint"

echo ""
echo "📱 Проверка адаптивных функций..."

# Проверка адаптивности в DataTable и ResponsiveTableWrapper
if [ -f "$PROJECT_ROOT/client/src/components/ui/responsive-table-wrapper.tsx" ] && grep -q "overflow-x-auto" "$PROJECT_ROOT/client/src/components/ui/responsive-table-wrapper.tsx"; then
    echo "✅ DataTable: горизонтальная прокрутка: OK (через ResponsiveTableWrapper)"
elif grep -q "overflow-x-auto" "$PROJECT_ROOT/client/src/components/DataTable.tsx"; then
    echo "✅ DataTable: горизонтальная прокрутка: OK (напрямую)"
else
    echo "❌ DataTable: горизонтальная прокрутка: НЕ НАЙДЕНО"
    ((CRITICAL_ISSUES++))
fi

check_content "$PROJECT_ROOT/client/src/components/DataTable.tsx" "sm:" "DataTable: мобильные breakpoints" "warning"
check_content "$PROJECT_ROOT/client/src/components/DataTable.tsx" "md:" "DataTable: планшетные breakpoints" "warning"

# Проверка мобильной навигации
check_content "$PROJECT_ROOT/client/src/components/Navigation.tsx" "md:hidden" "Navigation: мобильное меню" "critical"
check_content "$PROJECT_ROOT/client/src/components/Navigation.tsx" "hamburger\|menu-button\|☰" "Navigation: кнопка меню" "warning"

# Проверка адаптивности в других компонентах
check_content "$PROJECT_ROOT/client/src/pages/Dashboard.tsx" "sm:\|md:\|lg:" "Dashboard: адаптивные классы" "warning"

echo ""
echo "🎨 Проверка Stylelint..."

# Запуск Stylelint
if command -v npx &> /dev/null; then
    STYLELINT_OUTPUT=$(npx stylelint "**/*.css" "**/*.tsx" --formatter json --ignore-path .gitignore 2>/dev/null)
    if [ $? -eq 0 ]; then
        STYLELINT_COUNT=$(echo "$STYLELINT_OUTPUT" | jq -r '.[].warnings | length' 2>/dev/null | awk '{sum += $1} END {print sum}')
        if [ -z "$STYLELINT_COUNT" ] || [ "$STYLELINT_COUNT" = "null" ]; then
            STYLELINT_COUNT=0
        fi
        STYLELINT_ISSUES=$STYLELINT_COUNT
        echo "✅ Stylelint: $STYLELINT_ISSUES проблем найдено"
    else
        echo "⚠️ Stylelint: ошибка выполнения"
        ((WARNING_ISSUES++))
    fi
else
    echo "⚠️ npx не найден, пропускаем Stylelint"
    ((WARNING_ISSUES++))
fi

echo ""
echo "📊 Проверка размеров экранов..."

# Проверка breakpoints в CSS/Tailwind
if [ -f "$PROJECT_ROOT/tailwind.config.ts" ]; then
    if grep -q "screens" "$PROJECT_ROOT/tailwind.config.ts"; then
        echo "✅ Tailwind breakpoints: настроены"
    else
        echo "⚠️ Tailwind breakpoints: стандартные"
        ((WARNING_ISSUES++))
    fi
else
    echo "❌ Tailwind config не найден"
    ((CRITICAL_ISSUES++))
fi

# Проверка поддержки мобильных viewport
if [ -f "$PROJECT_ROOT/client/index.html" ]; then
    if grep -q "viewport" "$PROJECT_ROOT/client/index.html"; then
        echo "✅ Viewport meta: настроен"
    else
        echo "❌ Viewport meta: отсутствует"
        ((CRITICAL_ISSUES++))
    fi
fi

echo ""
echo "========================================="
echo "📋 ОТЧЕТ О ТЕСТИРОВАНИИ АДАПТИВНОСТИ"
echo "========================================="
echo ""
echo "📊 СВОДКА:"
echo "   Критичные проблемы: $CRITICAL_ISSUES"
echo "   Предупреждения: $WARNING_ISSUES"
echo "   Проблемы Stylelint: $STYLELINT_ISSUES"
echo ""

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo "🚨 КРИТИЧНЫЕ ПРОБЛЕМЫ:"
    echo "   Обнаружены проблемы, которые могут нарушить работу на мобильных устройствах"
    echo "   Рекомендуется исправить перед развертыванием"
    echo ""
fi

if [ $WARNING_ISSUES -gt 0 ]; then
    echo "⚠️ ПРЕДУПРЕЖДЕНИЯ:"
    echo "   Найдены проблемы, которые могут повлиять на пользовательский опыт"
    echo "   Рекомендуется рассмотреть для улучшения адаптивности"
    echo ""
fi

echo "💡 РЕКОМЕНДАЦИИ:"
echo "   1. Тестируйте на экранах шириной 320px, 375px, 768px, 1024px"
echo "   2. Используйте overflow-x-auto для широких таблиц"
echo "   3. Добавляйте мобильное меню для экранов < 768px"
echo "   4. Применяйте responsive классы: sm:, md:, lg:"

if [ $STYLELINT_ISSUES -gt 0 ]; then
    echo "   5. Запустите: npx stylelint \"**/*.css\" \"**/*.tsx\" --fix"
fi

echo ""
echo "🔧 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ:"
echo "   - Откройте http://localhost:5000/responsive-test"
echo "   - Включите режим устройства в DevTools (F12)"
echo "   - Проверьте все основные страницы на разных размерах экрана"
echo ""

# Создание файла отчета
REPORT_FILE="test_results_$(date +%Y-%m-%dT%H-%M-%S-%3NZ).log"
{
    echo "========================================="
    echo "ОТЧЕТ О ТЕСТИРОВАНИИ АДАПТИВНОСТИ"
    echo "Дата: $(date)"
    echo "========================================="
    echo ""
    echo "Критичные проблемы: $CRITICAL_ISSUES"
    echo "Предупреждения: $WARNING_ISSUES"
    echo "Проблемы Stylelint: $STYLELINT_ISSUES"
    echo ""
    echo "Результат: $([ $CRITICAL_ISSUES -eq 0 ] && echo "УСПЕШНО" || echo "ТРЕБУЕТ ИСПРАВЛЕНИЯ")"
} > "$REPORT_FILE"

echo "📄 Отчет сохранен: $REPORT_FILE"
echo ""

# Определение статуса выхода
if [ $CRITICAL_ISSUES -eq 0 ]; then
    echo "✅ Системный тест адаптивности ПРОЙДЕН"
    echo "⏱️ Время выполнения: $(date)"
    exit 0
else
    echo "❌ Системный тест адаптивности НЕ ПРОЙДЕН"
    echo "⏱️ Время выполнения: $(date)"
    exit 1
fi