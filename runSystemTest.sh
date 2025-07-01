#!/bin/bash

echo "🧪 Запуск автоматического интеграционного теста системы ERP"
echo "=============================================="

# Проверяем, что сервер запущен
echo "📡 Проверка соединения с сервером..."
if ! curl -s http://localhost:5000/api/products > /dev/null; then
    echo "❌ Сервер не запущен или недоступен на localhost:5000"
    echo "   Запустите сервер командой: npm run dev"
    exit 1
fi

echo "✅ Сервер доступен"

# Запускаем тест
echo "🚀 Запуск интеграционного теста..."
echo ""

npx tsx testSystem.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "🎉 Интеграционный тест завершен успешно!"
else
    echo "❌ Интеграционный тест завершен с ошибками (код: $exit_code)"
fi

exit $exit_code