// Утилиты для очистки и валидации данных
export class DataCleanerService {
  static cleanNumericValue(value: any): string {
    if (value === null || value === undefined) return "0";
    
    const cleaned = String(value)
      .replace(/[₽$€руб.]/gi, '') // Убираем символы валют
      .replace(/[гкгммсмм]/gi, '') // Убираем единицы измерения  
      .replace(/[^\d.,]/g, '') // Оставляем только цифры, точки и запятые
      .replace(',', '.'); // Заменяем запятую на точку
    
    const number = parseFloat(cleaned) || 0;
    return String(number);
  }

  static cleanTextValue(value: any): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  static validateNumericFields(data: any): Record<string, string> {
    const result: Record<string, string> = {};
    
    const numericFields = ['price', 'purchasePrice', 'weight', 'length', 'width', 'height'];
    
    for (const field of numericFields) {
      if (data[field] !== undefined) {
        result[field] = this.cleanNumericValue(data[field]);
      }
    }
    
    return result;
  }

  static sanitizeProductData(productData: any): any {
    return {
      name: productData.name || productData.Название || "Без названия",
      sku: this.cleanTextValue(productData.sku || productData.Артикул),
      price: this.cleanNumericValue(productData.price || productData.Цена),
      purchasePrice: this.cleanNumericValue(productData.purchasePrice || productData['Цена закупки']),
      weight: this.cleanNumericValue(productData.weight || productData.Вес),
      length: this.cleanNumericValue(productData.length || productData.Длина),
      width: this.cleanNumericValue(productData.width || productData.Ширина),
      height: this.cleanNumericValue(productData.height || productData.Высота),
      barcode: this.cleanTextValue(productData.barcode || productData.Штрихкод),
    };
  }
}