/**
 * 🔧 Централизованная нормализация данных для API
 * 
 * Преобразует поля базы данных в унифицированный формат API
 * для обеспечения согласованности всех интерфейсов
 */

/**
 * Стандартные поля API для продуктов и инвентаря
 */
export interface NormalizedInventoryItem {
  id: number;
  name: string;
  quantity: number;
  reserved?: number;
  available?: number;
}

/**
 * Поля из материализованных представлений или SQL запросов
 */
interface RawInventoryItem {
  // Возможные варианты полей ID
  id?: number;
  product_id?: number;
  
  // Возможные варианты полей названия
  name?: string;
  product_name?: string;
  
  // Возможные варианты количественных полей
  quantity?: string | number;
  total_quantity?: string | number;
  
  // Поля резервирования
  reserved?: string | number;
  reserved_quantity?: string | number;
  
  // Поля доступности
  available?: string | number;
  available_quantity?: string | number;
}

/**
 * Центральная функция нормализации данных инвентаря
 * 
 * Преобразует любую структуру данных из БД в унифицированный API формат
 */
export function normalizeInventoryItem(rawItem: RawInventoryItem): NormalizedInventoryItem {
  // Определяем ID (приоритет: id > product_id)
  const id = rawItem.id ?? rawItem.product_id;
  if (!id) {
    throw new Error('Нормализация: отсутствует поле ID в данных');
  }

  // Определяем название (приоритет: name > product_name)
  const name = rawItem.name ?? rawItem.product_name;
  if (!name) {
    throw new Error('Нормализация: отсутствует поле название в данных');
  }

  // Определяем количество (приоритет: quantity > total_quantity)
  const quantityValue = rawItem.quantity ?? rawItem.total_quantity ?? 0;
  const quantity = typeof quantityValue === 'string' ? 
    parseFloat(quantityValue) : quantityValue;

  // Базовый результат
  const normalized: NormalizedInventoryItem = {
    id: Number(id),
    name: String(name),
    quantity: Number(quantity) || 0
  };

  // Добавляем поля резервирования если присутствуют
  if (rawItem.reserved !== undefined || rawItem.reserved_quantity !== undefined) {
    const reservedValue = rawItem.reserved ?? rawItem.reserved_quantity ?? 0;
    normalized.reserved = Number(typeof reservedValue === 'string' ? 
      parseFloat(reservedValue) : reservedValue) || 0;
  }

  // Добавляем поля доступности если присутствуют
  if (rawItem.available !== undefined || rawItem.available_quantity !== undefined) {
    const availableValue = rawItem.available ?? rawItem.available_quantity ?? 0;
    normalized.available = Number(typeof availableValue === 'string' ? 
      parseFloat(availableValue) : availableValue) || 0;
  }

  return normalized;
}

/**
 * Нормализация массива элементов инвентаря
 */
export function normalizeInventoryArray(rawItems: RawInventoryItem[]): NormalizedInventoryItem[] {
  return rawItems.map((item, index) => {
    try {
      return normalizeInventoryItem(item);
    } catch (error) {
      throw new Error(`Ошибка нормализации элемента ${index}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Валидация структуры API ответа
 * 
 * Проверяет что все поля соответствуют стандарту API
 */
export function validateApiResponse(items: any[]): void {
  const forbiddenFields = [
    'product_id', 'product_name', 'total_quantity', 
    'reserved_quantity', 'available_quantity'
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Проверяем наличие обязательных полей
    if (!item.hasOwnProperty('id')) {
      throw new Error(`API валидация: отсутствует поле 'id' в элементе ${i}`);
    }
    if (!item.hasOwnProperty('name')) {
      throw new Error(`API валидация: отсутствует поле 'name' в элементе ${i}`);
    }
    if (!item.hasOwnProperty('quantity')) {
      throw new Error(`API валидация: отсутствует поле 'quantity' в элементе ${i}`);
    }

    // Проверяем отсутствие запрещенных полей БД
    for (const field of forbiddenFields) {
      if (item.hasOwnProperty(field)) {
        throw new Error(`API валидация: найдено запрещенное поле '${field}' в элементе ${i}. API должен возвращать только унифицированные поля.`);
      }
    }
  }
}