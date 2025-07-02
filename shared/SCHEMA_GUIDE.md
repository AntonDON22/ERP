# Руководство по использованию схем валидации

## Обзор

В проекте используется централизованная система валидации через модуль `zFields.ts`. Все числовые поля, цены, количества и другие типизированные данные должны определяться только в этом модуле.

## Архитектурное правило

**ВАЖНО**: Запрещено создавать собственные схемы валидации с `.string()`, `.number()`, `.coerce()` напрямую в схемах. Все стандартные поля должны импортироваться из `zFields.ts`.

## Доступные поля в zFields.ts

### Ценовые поля
- `zPrice` - Денежные суммы с автопреобразованием строк в числа
- `zPriceString` - Ценовые поля для записи в БД (строки)

### Количественные поля
- `zQuantity` - Количества с дробными значениями
- `zQuantityInteger` - Целые количества (штуки, единицы)
- `zQuantityString` - Количества для записи в БД (строки)

### Системные поля
- `zId` - Идентификаторы записей (положительные числа)
- `zPercent` - Процентные значения (0-100)
- `zWeight` - Вес товаров с автопреобразованием

### Размеры и габариты
- Используйте `zQuantity` для длины, ширины, высоты

## Типы схем в проекте

### Input схемы (входные)
Используются в API endpoints для приема данных от клиента:
```typescript
const orderItemInputSchema = z.object({
  productId: zId,
  quantity: zQuantityInteger, // Принимает числа и строки
  price: zPrice               // Автопреобразование
});
```

### Insert схемы (для БД)
Используются только для передачи данных в Drizzle ORM:
```typescript
const insertOrderItemSchema = z.object({
  productId: zId,
  quantity: zQuantityString,  // Строго строки для БД
  price: zPriceString         // Строки для Postgres
});
```

### Output схемы (для ответов)
Используются для возврата данных клиенту:
```typescript
const orderItemSchema = z.object({
  id: zId,
  productId: zId,
  quantity: zQuantity,        // Числа для фронтенда
  price: zPrice              // Читаемые значения
});
```

## Правила использования

### ✅ Правильно

```typescript
import { zPrice, zQuantity, zId } from './zFields';

const productSchema = z.object({
  id: zId,
  price: zPrice,
  weight: zWeight
});
```

### ❌ Неправильно

```typescript
// НЕ ДЕЛАЙТЕ ТАК!
const productSchema = z.object({
  id: z.number().positive(),     // Используйте zId
  price: z.coerce.number(),      // Используйте zPrice
  weight: z.string().min(1)      // Используйте zWeight
});
```

## Использование в API

### В контроллерах
Используйте только input-схемы для валидации данных от клиента:

```typescript
// ✅ Правильно
router.post('/products', async (req, res) => {
  const validatedData = productInputSchema.parse(req.body);
  // ...
});

// ❌ Неправильно - insertSchema только для БД!
router.post('/products', async (req, res) => {
  const validatedData = insertProductSchema.parse(req.body);
  // ...
});
```

### В сервисах
Insert-схемы используются только после input-валидации:

```typescript
// ✅ Правильно
async createProduct(inputData: ProductInput) {
  const validatedInput = productInputSchema.parse(inputData);
  const forDatabase = insertProductSchema.parse(validatedInput);
  return await db.insert(products).values(forDatabase);
}
```

## Добавление новых полей

При необходимости новых типов валидации:

1. Добавьте поле в `zFields.ts`:
```typescript
export const zTaxPercent = z
  .union([z.string(), z.number()])
  .transform(cleanNumericValue)
  .pipe(z.number().min(0).max(100))
  .describe("Налоговый процент (0-100)");
```

2. Добавьте тесты в `tests/utils/zFields.test.ts`
3. Используйте новое поле во всех схемах

## Обработка ошибок

Все поля в `zFields.ts` содержат русскоязычные сообщения об ошибках:
- "Цена должна быть положительным числом"
- "Количество не может быть отрицательным"
- "ID должен быть положительным числом"

## Тестирование

Все поля покрыты автоматическими тестами в `tests/utils/zFields.test.ts`, включая:
- Валидные значения (числа, строки)
- Невалидные значения (пустые строки, null, undefined)
- Граничные случаи (отрицательные числа, слишком большие значения)
- Преобразование типов (строка → число)

## Заключение

Следование этим правилам обеспечивает:
- Консистентную валидацию по всему проекту
- Предотвращение ошибок типов
- Легкую поддержку и расширение
- Единообразные сообщения об ошибках

**Помните**: Любые отклонения от этой архитектуры создают риск ошибок валидации и должны быть согласованы с командой.