# 🗄️ Тесты системы кеширования

Комплексные тесты для системы кеширования ERP системы, включающие проверку производительности, надежности и функциональности.

## 📁 Структура тестов

### `tests/services/cacheService.test.ts`
**Цель:** Тестирование базового сервиса кеширования
- ✅ Memory cache fallback при недоступности Redis
- ✅ Сохранение и получение данных различных типов
- ✅ TTL (Time To Live) и автоматическое удаление устаревших данных
- ✅ Pattern invalidation для групповой очистки кеша
- ✅ Метод getOrSet для кеширования с автоматической загрузкой
- ✅ Производительность операций кеширования

### `tests/middleware/cacheMiddleware.test.ts`
**Цель:** Тестирование HTTP middleware кеширования
- ✅ Обработка GET/POST/PUT/DELETE запросов (кешируются только GET)
- ✅ Генерация ключей кеша (стандартные и кастомные)
- ✅ Cache hit/miss сценарии
- ✅ Интеграция с метриками производительности
- ✅ Обработка ошибок и graceful degradation
- ✅ Специализированные конфигурации (inventoryCache, mediumCache)

### `tests/integration/cacheIntegration.test.ts`
**Цель:** Интеграционное тестирование кеширования в реальных API
- ✅ Кеширование различных endpoints (/api/warehouses, /api/contractors, /api/inventory)
- ✅ Автоматическая инвалидация кеша при изменении данных
- ✅ Измерение улучшения производительности от кеширования
- ✅ Обработка одновременных запросов
- ✅ Устойчивость к ошибкам кеша

## 🚀 Запуск тестов

```bash
# Все тесты кеширования
npx vitest run tests/services/cacheService.test.ts tests/middleware/cacheMiddleware.test.ts tests/integration/cacheIntegration.test.ts

# Только базовый сервис
npx vitest run tests/services/cacheService.test.ts

# Только middleware
npx vitest run tests/middleware/cacheMiddleware.test.ts

# Только интеграционные тесты
npx vitest run tests/integration/cacheIntegration.test.ts
```

## 📊 Покрытие тестов

### CacheService (10 тестов)
- **Memory Cache Fallback** (5 тестов) - Основная функциональность
- **Pattern Invalidation** (2 теста) - Групповая очистка
- **GetOrSet Method** (2 теста) - Автоматическая загрузка
- **Performance** (1 тест) - Производительность

### CacheMiddleware (16 тестов)
- **Basic Functionality** (3 теста) - Базовая логика
- **Cache Hit/Miss Scenarios** (4 теста) - Основные сценарии
- **Error Handling** (2 теста) - Обработка ошибок
- **Specialized Configurations** (3 теста) - Кастомные конфигурации
- **Performance Metrics** (2 теста) - Интеграция с метриками
- **TTL Configuration** (2 теста) - Настройка времени жизни

### Cache Integration (планируется 12+ тестов)
- **API Endpoint Caching** (4 теста) - Кеширование API
- **Cache Invalidation** (2 теста) - Автоинвалидация
- **Performance Measurement** (2 теста) - Измерение улучшений
- **Error Handling** (2 теста) - Устойчивость к ошибкам
- **HTTP Methods** (2 теста) - Различные HTTP методы

## 🔧 Конфигурация

Тесты автоматически настраивают:
- ✅ **Memory Cache Fallback** - Работа без Redis
- ✅ **Автоматическая очистка** между тестами
- ✅ **Мокирование** внешних зависимостей
- ✅ **Изоляция тестов** - Каждый тест независим

## 📈 Метрики производительности

Тесты проверяют:
- **Cache Hit Time**: < 50ms (кешированные запросы)
- **Performance Improvement**: минимум 2x ускорение
- **Memory Usage**: эффективное использование памяти
- **TTL Accuracy**: точное истечение времени жизни

## 🐛 Обнаружение проблем

Тесты помогают выявить:
- **Redis недоступен** - Fallback на memory cache
- **Память переполнена** - Автоочистка устаревших данных
- **Ключи кеша конфликтуют** - Правильная генерация ключей
- **Производительность деградирует** - Измерение времени ответа
- **API изменения не отражаются** - Проверка инвалидации

## 🎯 Ключевые сценарии

### Сценарий 1: Redis недоступен
```typescript
// Тест проверяет что система продолжает работать
// с memory cache даже если Redis недоступен
```

### Сценарий 2: Cache Hit Rate
```typescript
// Первый запрос: miss (идет в БД)
// Второй запрос: hit (из кеша, быстрее в 10+ раз)
```

### Сценарий 3: Автоинвалидация
```typescript
// Создание документа → инвалидация inventory кеша
// Следующий запрос inventory → fresh data из БД
```