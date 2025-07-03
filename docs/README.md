# 📚 Полная документация ERP системы

## Обзор системы

Enterprise-grade ERP система с современной архитектурой, высокой производительностью и comprehensive системой мониторинга.

## 🗂️ Структура документации

### 🏗️ Архитектура и тестирование

| Документ | Описание | Статус |
|----------|----------|--------|
| **[TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md)** | Полная архитектура тестирования с 8 категориями тестов | ✅ Готово |
| **[ARCHITECTURAL_PROTECTION.md](./ARCHITECTURAL_PROTECTION.md)** | Защита от автогенерации ошибок и 100% централизация API | ✅ Готово |

### 📊 Производительность и мониторинг

| Документ | Описание | Статус |
|----------|----------|--------|
| **[PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)** | Real-time мониторинг и оптимизация производительности | ✅ Готово |

### 📱 Пользовательский интерфейс

| Документ | Описание | Статус |
|----------|----------|--------|
| **Responsive Design Guide** | Стандарты адаптивности для экранов от 320px | 🚧 В процессе |
| **UI Components Library** | Централизованная библиотека компонентов | 🚧 В процессе |

### 🔧 Руководства разработчика

| Документ | Описание | Статус |
|----------|----------|--------|
| **API Integration Guide** | Руководство по интеграции с API | 📋 Планируется |
| **Database Schema Guide** | Схема базы данных и миграции | 📋 Планируется |

## ✅ Статус архитектуры (обновлено 03.07.2025)

### 🎯 100% Централизация API маршрутов
- ✅ Все клиентские хуки используют `shared/apiRoutes.ts`
- ✅ Удалены дублирующие API_ENDPOINTS из других файлов
- ✅ QueryKey стандартизированы во всех React Query хуках
- ✅ 12 архитектурных тестов проходят успешно
- ✅ Единственная техническая строка "/api/*" для 404 handler

### 🔧 Валидационная система
- ✅ 181 тест валидации проходят успешно (100%)
- ✅ Централизованные поля через `shared/zFields.ts`
- ✅ Русскоязычные сообщения об ошибках
- ✅ Enterprise-grade стандарты

## 🚀 Быстрый старт

### Установка и запуск

```bash
# Клонирование репозитория
git clone <repository-url>
cd erp-system

# Установка зависимостей
npm install

# Настройка базы данных
npm run db:push

# Запуск в режиме разработки
npm run dev
```

### Основные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск development сервера |
| `npm run build` | Сборка для production |
| `npx vitest run` | Запуск всех тестов |
| `npx vitest run tests/architectural/` | **Архитектурные тесты (обязательно)** |
| `npx vitest run tests/services/` | Unit тесты сервисов |
| `npx vitest run tests/integration/` | Интеграционные тесты |
| `npm run lint` | Проверка качества кода |

### 🔍 Проверка централизации API

```bash
# Проверить отсутствие жестко прописанных API путей
grep -r --include="*.ts" --include="*.tsx" --exclude="*apiRoutes*" --exclude="*test*" '"/api/' client/ server/ shared/

# Должен вернуть только: server/index.ts:104:  app.use("/api/*"
# Если больше - НАРУШЕНИЕ АРХИТЕКТУРЫ!
```

## 📊 Ключевые метрики системы

### Performance Benchmarks
- **API Response Time**: 40-116ms (среднее)
- **Cache Hit Rate**: 83-100%
- **Database Queries**: Оптимизированы с материализованными представлениями
- **Test Coverage**: >90% для critical paths

### Архитектурная зрелость
- ✅ **Централизованные API маршруты**: 100% compliance
- ✅ **Унифицированная валидация**: 95% через zFields
- ✅ **Адаптивный дизайн**: 43% (улучшается)
- ✅ **TypeScript Coverage**: 100%
- ✅ **Чистая кодовая база**: Удален весь технический мусор

## 🔍 Системы контроля качества

### Автоматические проверки

```bash
# Архитектурные проверки
npx vitest run tests/architectural/

# Аудит адаптивности  
./scripts/run-responsiveness-audit.sh

# Автоматические исправления
./scripts/run-responsive-fixes.sh

# Производительность
./scripts/performance-test-fixed.sh
```

### CI/CD Pipeline

- **GitHub Actions** интеграция
- **Автоматические тесты** на каждый commit
- **Архитектурные проверки** в pre-commit хуках
- **Performance monitoring** в production

## 🛠️ Инструменты разработки

### Основной стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| **React** | 18+ | Frontend фреймворк |
| **TypeScript** | 5.6+ | Типизация |
| **Express.js** | Latest | Backend API |
| **PostgreSQL** | Latest | База данных |
| **Redis** | Cloud | Кеширование |
| **Drizzle ORM** | Latest | ORM и миграции |

### Инструменты тестирования

| Инструмент | Назначение |
|------------|------------|
| **Vitest** | Unit тестирование |
| **Playwright** | E2E тестирование |
| **ESLint** | Статический анализ |
| **TypeScript** | Проверка типов |

### Мониторинг и логирование

| Сервис | Назначение |
|--------|------------|
| **PerformanceMetricsService** | Сбор метрик |
| **Structured Logging** | Централизованные логи |
| **Real-time Dashboard** | Визуализация метрик |
| **Cache Analytics** | Анализ кеширования |

## 📁 Структура проекта

```
ERP System/
├── 📁 client/src/           # React фронтенд
│   ├── 📁 components/       # UI компоненты
│   ├── 📁 pages/           # Страницы приложения
│   ├── 📁 hooks/           # Кастомные хуки
│   └── 📁 lib/             # Утилиты клиента
├── 📁 server/              # Express бекенд
│   ├── 📁 routes/          # API маршруты
│   ├── 📁 services/        # Бизнес-логика
│   ├── 📁 middleware/      # Промежуточное ПО
│   └── 📁 storage/         # Слой данных
├── 📁 shared/              # Общий код
│   ├── schema.ts           # Схемы БД
│   ├── apiRoutes.ts        # API константы
│   ├── zFields.ts          # Валидация
│   └── ui.ts               # UI импорты
├── 📁 tests/               # Тестирование
│   ├── 📁 services/        # Тесты сервисов
│   ├── 📁 integration/     # Интеграционные
│   ├── 📁 architectural/   # Архитектурные
│   └── 📁 utils/           # Тесты утилит
├── 📁 docs/                # Документация
├── 📁 scripts/             # Автоматизация
└── 📄 package.json         # Конфигурация
```

## 🔗 Полезные ссылки

### Документация
- [Архитектура тестирования](./TESTING_ARCHITECTURE.md)
- [Мониторинг производительности](./PERFORMANCE_MONITORING.md)  
- [Архитектурная защита](./ARCHITECTURAL_PROTECTION.md)

### Внешние ресурсы
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Участие в разработке

### Стандарты кода

1. **TypeScript** - обязательная типизация
2. **ESLint + Prettier** - автоматическое форматирование
3. **Централизованные API маршруты** - через `shared/apiRoutes.ts`
4. **Унифицированная валидация** - через `shared/zFields.ts`
5. **Архитектурные тесты** - обязательные проверки

### Процесс разработки

```bash
# 1. Создание feature ветки
git checkout -b feature/new-functionality

# 2. Разработка с тестами
npx vitest

# 3. Проверка архитектурных стандартов  
npx vitest run tests/architectural/

# 4. Commit с автоматическими проверками
git commit -m "feat: добавлена новая функциональность"

# 5. Push и создание PR
git push origin feature/new-functionality
```

### Code Review чек-лист

- ✅ Все тесты проходят
- ✅ TypeScript ошибок нет
- ✅ Использованы централизованные API маршруты
- ✅ Применена унифицированная валидация
- ✅ Архитектурные стандарты соблюдены
- ✅ Производительность не ухудшилась

## 📞 Поддержка

### Частые проблемы

| Проблема | Решение |
|----------|---------|
| Медленные API | Проверить Cache Hit Rate, запустить cache warmup |
| TypeScript ошибки | Обновить типы, проверить imports |
| Тесты не проходят | Проверить изоляцию, очистить моки |
| Архитектурные нарушения | Использовать централизованные константы |

### Диагностические команды

```bash
# Проверка состояния системы
curl http://localhost:5000/api/metrics

# Статус кеша
curl http://localhost:5000/api/cache/status

# Принудительный разогрев кеша
curl -X POST http://localhost:5000/api/cache/warmup

# Архитектурный аудит
npm run audit:architecture
```

## 🎯 Roadmap

### Q1 2025
- ✅ Система тестирования
- ✅ Мониторинг производительности  
- ✅ Архитектурная защита
- 🚧 Полная адаптивность

### Q2 2025
- 📋 Mobile приложение
- 📋 Advanced analytics
- 📋 Multi-tenancy
- 📋 API v2

### Долгосрочные цели
- 🚀 Микросервисная архитектура
- 📊 Machine Learning интеграция
- 🔒 Advanced security
- 🌍 Международная локализация

---

**Система готова к enterprise использованию с высокими стандартами качества, производительности и maintainability.**