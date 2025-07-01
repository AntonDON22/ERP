// Утилиты для очистки и валидации данных
export class DataCleanerService {
  static cleanNumericValue(value: any): string {
    if (value === null || value === undefined || value === '') return "0";
    
    let strValue = String(value).trim();
    
    // Сначала проверим на научную нотацию
    if (/^\d+\.?\d*[eE][+-]?\d+$/.test(strValue)) {
      const number = parseFloat(strValue);
      if (!isNaN(number)) {
        return String(number);
      }
    }
    
    let cleaned = strValue
      // Убираем символы валют
      .replace(/[₽$€]/g, '')
      .replace(/руб\.?/gi, '')
      // Убираем единицы измерения (более точные регексы)
      .replace(/\s*(г|кг|мм|см|м)\s*$/gi, '')
      .replace(/\s*(mm|kg|g)\s*$/gi, '')
      // Убираем проценты
      .replace(/%/g, '')
      // Обрабатываем дроби
      .replace(/(\d+)\/(\d+)/g, (match, num, den) => String(parseFloat(num) / parseFloat(den)))
      // Убираем тысячные разделители (пробелы между группами из 3 цифр)
      .replace(/(\d{1,3})\s+(\d{3})/g, '$1$2')
      .replace(/(\d{1,3})\s+(\d{3})/g, '$1$2') // повторяем для множественных групп
      // Убираем все кроме цифр, точек, запятых, знака минус и скобок
      .replace(/[^\d.,()-]/g, '')
      // Обрабатываем отрицательные числа в скобках
      .replace(/^\((\d+(?:[.,]\d+)?)\)$/, '-$1')
      // Заменяем запятую на точку для десятичного разделителя
      .replace(/,/g, '.');
    
    // Убираем лишние точки, оставляя только одну десятичную
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    const number = parseFloat(cleaned);
    if (isNaN(number)) return "0";
    
    // Сохраняем исходное форматирование для совместимости с тестами
    if (strValue.includes('.') && strValue.match(/\.\d{2}$/)) {
      // Если исходное значение имело 2 десятичных знака, сохраняем их
      return number.toFixed(2);
    } else if (cleaned.includes('.')) {
      // Сохраняем десятичную часть как есть
      return String(number);
    } else {
      return String(number);
    }
  }

  static cleanTextValue(value: any): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  static validateNumericFields(data: any): Record<string, string> {
    const errors: Record<string, string> = {};
    
    const fieldMappings = {
      price: 'Цена должна быть числом',
      purchasePrice: 'Цена закупки должна быть числом',  
      weight: 'Вес должен быть числом',
      length: 'Длина должна быть числом',
      width: 'Ширина должна быть числом',
      height: 'Высота должна быть числом',
      depth: 'Глубина должна быть числом'
    };
    
    for (const [field, errorMessage] of Object.entries(fieldMappings)) {
      if (data[field] !== undefined) {
        const cleaned = this.cleanNumericValue(data[field]);
        const number = parseFloat(cleaned);
        if (isNaN(number) && cleaned !== "0") {
          errors[field] = errorMessage;
        }
      }
    }
    
    return errors;
  }

  static sanitizeProductData(productData: any): any {
    return {
      name: this.cleanTextValue(productData.name || productData.Название || "Без названия"),
      sku: this.cleanTextValue(productData.sku || productData.Артикул),
      price: this.cleanNumericValue(productData.price || productData.Цена),
      purchasePrice: this.cleanNumericValue(productData.purchasePrice || productData['Цена закупки']),
      weight: this.cleanNumericValue(productData.weight || productData.Вес),
      length: this.cleanNumericValue(productData.length || productData.Длина),
      width: this.cleanNumericValue(productData.width || productData.Ширина),
      height: this.cleanNumericValue(productData.height || productData.Высота),
      depth: this.cleanNumericValue(productData.depth || productData.Глубина),
      barcode: this.cleanTextValue(productData.barcode || productData.Штрихкод),
    };
  }
}