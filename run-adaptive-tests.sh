#!/bin/bash

echo "🔧 Запуск адаптивных тестов ERP системы..."
echo ""

# Проверяем что сервер запущен
if ! curl -s http://localhost:5000 > /dev/null; then
    echo "⚠️ Предупреждение: Сервер не запущен на порту 5000"
    echo "   Запустите: npm run dev"
    echo ""
fi

# Делаем скрипт исполняемым и запускаем
chmod +x tests/adaptive/runSystemTest.sh
./tests/adaptive/runSystemTest.sh

exit $?