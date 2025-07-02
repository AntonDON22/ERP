#!/bin/bash

# 🧪 Комплексный скрипт тестирования ERP системы
# Автор: ERP Development Team
# Дата: 02.07.2025

set -e

echo "🧪 ЗАПУСК ПОЛНОЙ СИСТЕМЫ ТЕСТИРОВАНИЯ ERP"
echo "========================================"
echo ""

# Функция для красивого вывода результатов
print_result() {
    local category="$1"
    local status="$2"
    local time="$3"
    local details="$4"
    
    if [ "$status" = "PASS" ]; then
        echo "✅ $category: $status ($time) $details"
    else
        echo "❌ $category: $status ($time) $details"
    fi
}

# Функция для запуска категории тестов
run_test_category() {
    local name="$1"
    local command="$2"
    local description="$3"
    
    echo "🔄 Запуск $name тестов..."
    start_time=$(date +%s)
    
    if eval "$command" > /tmp/test_output_$$ 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        print_result "$description" "PASS" "${duration}s" ""
        return 0
    else
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        print_result "$description" "FAIL" "${duration}s" ""
        echo "Ошибки:"
        cat /tmp/test_output_$$
        return 1
    fi
}

# Переменные для подсчета результатов
total_tests=0
passed_tests=0
failed_tests=0

echo "1️⃣ UNIT ТЕСТЫ - Основные компоненты"
echo "===================================="

# Services Tests
total_tests=$((total_tests + 1))
if run_test_category "services" "NODE_ENV=test npx vitest run tests/services --reporter=verbose" "Services (бизнес-логика)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Utils Tests  
total_tests=$((total_tests + 1))
if run_test_category "utils" "NODE_ENV=test npx vitest run tests/utils --reporter=verbose" "Utils (утилиты)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Middleware Tests
total_tests=$((total_tests + 1))
if run_test_category "middleware" "NODE_ENV=test npx vitest run tests/middleware --reporter=verbose" "Middleware (безопасность)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# zFields Validation Tests
total_tests=$((total_tests + 1))
if run_test_category "zfields" "NODE_ENV=test npx vitest run tests/zFields.test.ts tests/zFields --reporter=verbose" "zFields (валидация)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Logs Tests
total_tests=$((total_tests + 1))
if run_test_category "logs" "NODE_ENV=test npx vitest run tests/logs.test.ts --reporter=verbose" "Logs (логирование)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
echo "2️⃣ INTEGRATION ТЕСТЫ - Взаимодействие компонентов"
echo "================================================="

# Integration Tests
total_tests=$((total_tests + 1))
if run_test_category "integration" "NODE_ENV=test npx vitest run tests/integration --reporter=verbose" "Integration (API и система)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# API Routing Tests
total_tests=$((total_tests + 1))
if run_test_category "api-routing" "NODE_ENV=test npx vitest run tests/api-routing.test.ts --reporter=verbose" "API Routing (маршрутизация)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
echo "3️⃣ СПЕЦИАЛИЗИРОВАННЫЕ ТЕСТЫ"
echo "============================"

# Cache Tests
total_tests=$((total_tests + 1))
if run_test_category "cache" "NODE_ENV=test npx vitest run tests/cache --reporter=verbose" "Cache (кеширование)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Validation Tests
total_tests=$((total_tests + 1))
if run_test_category "validation" "NODE_ENV=test npx vitest run tests/validation --reporter=verbose" "Validation (схемы данных)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Performance Tests
total_tests=$((total_tests + 1))
if run_test_category "performance" "NODE_ENV=test npx vitest run tests/performance --reporter=verbose" "Performance (производительность)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
echo "4️⃣ АДАПТИВНЫЕ ТЕСТЫ"
echo "==================="

# Adaptive Tests (если скрипт существует)
if [ -f "./tests/adaptive/runSystemTest.sh" ]; then
    total_tests=$((total_tests + 1))
    if run_test_category "adaptive" "./tests/adaptive/runSystemTest.sh" "Adaptive (responsive дизайн)"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
else
    echo "⚠️  Adaptive тесты пропущены (скрипт не найден)"
fi

echo ""
echo "🎯 ФИНАЛЬНАЯ СВОДКА РЕЗУЛЬТАТОВ"
echo "==============================="
echo "Всего категорий тестов: $total_tests"
echo "✅ Прошли успешно: $passed_tests"
echo "❌ Провалились: $failed_tests"

# Вычисляем процент успеха
if [ $total_tests -gt 0 ]; then
    success_rate=$(( (passed_tests * 100) / total_tests ))
    echo "📊 Процент успеха: $success_rate%"
else
    success_rate=0
fi

echo ""

# Общий результат
if [ $failed_tests -eq 0 ]; then
    echo "🏆 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!"
    echo "Система готова к развертыванию."
    exit 0
elif [ $success_rate -ge 80 ]; then
    echo "⚠️  БОЛЬШИНСТВО ТЕСТОВ ПРОШЛИ ($success_rate%)"
    echo "Рекомендуется исправить оставшиеся проблемы."
    exit 1
else
    echo "❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ В ТЕСТАХ ($success_rate%)"
    echo "Необходимо исправить проблемы перед развертыванием."
    exit 2
fi

# Очистка временных файлов
rm -f /tmp/test_output_$$