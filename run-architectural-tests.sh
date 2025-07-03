#!/bin/bash

# 🔒 АРХИТЕКТУРНАЯ ЗАЩИТА: Запуск архитектурных тестов
# Этот скрипт проверяет соблюдение архитектурных правил

echo "🔒 Запуск архитектурной защиты системы..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода статуса
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Счетчики
TOTAL_CHECKS=0
FAILED_CHECKS=0

echo -e "${BLUE}📋 Проверка 1: ESLint архитектурные правила${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Проверяем ESLint
if npx eslint --ext .ts,.tsx client/ server/ shared/ --max-warnings 0; then
    print_status 0 "ESLint: Все архитектурные правила соблюдены"
else
    print_status 1 "ESLint: Найдены нарушения архитектурных правил"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "\n${BLUE}📋 Проверка 2: TypeScript компиляция${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Проверяем TypeScript
if npx tsc --noEmit; then
    print_status 0 "TypeScript: Компиляция успешна"
else
    print_status 1 "TypeScript: Ошибки компиляции"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "\n${BLUE}📋 Проверка 3: Архитектурные unit-тесты${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Запускаем архитектурные тесты
if npx vitest run tests/architectural/ --reporter=verbose; then
    print_status 0 "Архитектурные тесты: Все проверки пройдены"
else
    print_status 1 "Архитектурные тесты: Найдены нарушения"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "\n${BLUE}📋 Проверка 4: Поиск запрещенных паттернов${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Ищем прямые API строки (исключая специальные файлы)
API_VIOLATIONS=$(grep -r --include="*.ts" --include="*.tsx" \
  --exclude="*apiRoutes*" --exclude="*test*" --exclude="*spec*" \
  '"/api/' client/ server/ shared/ 2>/dev/null | wc -l)

if [ "$API_VIOLATIONS" -eq 0 ]; then
    print_status 0 "API Паттерны: Прямые строки API не найдены"
else
    print_status 1 "API Паттерны: Найдено $API_VIOLATIONS нарушений"
    echo -e "${YELLOW}Найденные нарушения:${NC}"
    grep -r --include="*.ts" --include="*.tsx" \
      --exclude="*apiRoutes*" --exclude="*test*" --exclude="*spec*" \
      '"/api/' client/ server/ shared/ 2>/dev/null | head -5
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "\n${BLUE}📋 Проверка 5: Использование 'any' типов${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Ищем использование any (исключая тестовые файлы)
ANY_VIOLATIONS=$(grep -r --include="*.ts" --include="*.tsx" \
  --exclude="*test*" --exclude="*spec*" \
  ': any\|<any>\|as any' client/ server/ shared/ 2>/dev/null | wc -l)

if [ "$ANY_VIOLATIONS" -eq 0 ]; then
    print_status 0 "TypeScript типы: 'any' типы не найдены"
else
    print_status 1 "TypeScript типы: Найдено $ANY_VIOLATIONS использований 'any'"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "\n${BLUE}📋 Проверка 6: Прямые UI импорты${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Ищем прямые импорты UI компонентов
UI_VIOLATIONS=$(grep -r --include="*.tsx" --include="*.ts" \
  'from.*@/components/ui/' client/ 2>/dev/null | wc -l)

if [ "$UI_VIOLATIONS" -eq 0 ]; then
    print_status 0 "UI Импорты: Прямые импорты не найдены"
else
    print_status 1 "UI Импорты: Найдено $UI_VIOLATIONS прямых импортов"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Итоговый результат
echo -e "\n${BLUE}📊 РЕЗУЛЬТАТ АРХИТЕКТУРНОЙ ЗАЩИТЫ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!${NC}"
    echo -e "${GREEN}✅ Система защищена от архитектурных нарушений${NC}"
    echo -e "${GREEN}✅ Код готов к production развертыванию${NC}"
    exit 0
else
    echo -e "${RED}⚠️  НАЙДЕНЫ АРХИТЕКТУРНЫЕ НАРУШЕНИЯ!${NC}"
    echo -e "${RED}❌ Проваленных проверок: $FAILED_CHECKS из $TOTAL_CHECKS${NC}"
    echo -e "${YELLOW}📋 Действия для исправления:${NC}"
    echo "   1. Проверить вывод ESLint выше"
    echo "   2. Исправить найденные нарушения"
    echo "   3. Запустить тесты повторно"
    exit 1
fi