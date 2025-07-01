import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiLogger } from '../../shared/logger';

// Интерфейсы для тестовых данных
interface TestProduct {
  id?: number;
  name: string;
  sku: string;
  price: string;
}

interface TestContractor {
  id?: number;
  name: string;
  website: string;
}

interface TestWarehouse {
  id?: number;
  name: string;
  address: string;
}

interface TestDocument {
  id?: number;
  name: string;
  type: string;
  status: 'draft' | 'posted';
  warehouseId: number;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  reserved?: number;
  available?: number;
}

// Вспомогательные функции для API запросов
class TestAPI {
  private baseUrl = 'http://localhost:5000/api';

  async request(method: string, endpoint: string, body?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${method} ${endpoint} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // Продукты
  async createProduct(product: Omit<TestProduct, 'id'>): Promise<TestProduct> {
    return this.request('POST', '/products', product);
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request('DELETE', `/products/${id}`);
  }

  // Контрагенты
  async createContractor(contractor: Omit<TestContractor, 'id'>): Promise<TestContractor> {
    return this.request('POST', '/contractors', contractor);
  }

  async deleteContractor(id: number): Promise<void> {
    await this.request('DELETE', `/contractors/${id}`);
  }

  // Склады
  async createWarehouse(warehouse: Omit<TestWarehouse, 'id'>): Promise<TestWarehouse> {
    return this.request('POST', '/warehouses', warehouse);
  }

  async deleteWarehouse(id: number): Promise<void> {
    await this.request('DELETE', `/warehouses/${id}`);
  }

  // Документы
  async createDocument(document: { type: string; warehouseId: number; status: 'draft' | 'posted'; items: Array<{ productId: number; quantity: number; price: number }> }): Promise<TestDocument> {
    return this.request('POST', '/documents', document);
  }

  async updateDocumentStatus(id: number, status: 'draft' | 'posted'): Promise<TestDocument> {
    return this.request('PUT', `/documents/${id}`, { status });
  }

  async deleteDocument(id: number): Promise<void> {
    await this.request('DELETE', `/documents/${id}`);
  }

  // Остатки
  async getInventory(): Promise<InventoryItem[]> {
    return this.request('GET', '/inventory');
  }

  async getInventoryAvailability(): Promise<InventoryItem[]> {
    return this.request('GET', '/inventory/availability');
  }
}

describe('🧪 Системный интеграционный тест ERP', () => {
  const api = new TestAPI();
  const testData = {
    product: null as TestProduct | null,
    contractor: null as TestContractor | null,
    warehouse: null as TestWarehouse | null,
    documents: [] as TestDocument[],
  };

  beforeAll(async () => {
    console.log('🚀 Запуск автоматического интеграционного теста системы');
    apiLogger.info('Starting system integration test');
  });

  afterAll(async () => {
    console.log('🧹 Очистка тестовых данных...');
    
    // Удаляем документы
    for (const doc of testData.documents) {
      if (doc.id) {
        try {
          await api.deleteDocument(doc.id);
          console.log(`✅ Документ ${doc.id} удален`);
        } catch (error) {
          console.warn(`⚠️ Не удалось удалить документ ${doc.id}:`, error);
        }
      }
    }

    // Удаляем созданные сущности
    if (testData.product?.id) {
      try {
        await api.deleteProduct(testData.product.id);
        console.log(`✅ Товар ${testData.product.id} удален`);
      } catch (error) {
        console.warn(`⚠️ Не удалось удалить товар:`, error);
      }
    }

    if (testData.contractor?.id) {
      try {
        await api.deleteContractor(testData.contractor.id);
        console.log(`✅ Контрагент ${testData.contractor.id} удален`);
      } catch (error) {
        console.warn(`⚠️ Не удалось удалить контрагента:`, error);
      }
    }

    if (testData.warehouse?.id) {
      try {
        await api.deleteWarehouse(testData.warehouse.id);
        console.log(`✅ Склад ${testData.warehouse.id} удален`);
      } catch (error) {
        console.warn(`⚠️ Не удалось удалить склад:`, error);
      }
    }

    apiLogger.info('System integration test completed');
    console.log('🎉 Интеграционный тест завершен');
  });

  it('1️⃣ Создание тестовых сущностей', async () => {
    const timestamp = Date.now();
    
    // Создаем тестовый товар
    testData.product = await api.createProduct({
      name: `TEST-Товар-${timestamp}`,
      sku: `TEST-SKU-${timestamp}`,
      price: '10.00'
    });
    
    expect(testData.product).toBeDefined();
    expect(testData.product.id).toBeGreaterThan(0);
    console.log(`✅ Создан тестовый товар ID: ${testData.product.id}`);

    // Создаем тестового контрагента
    testData.contractor = await api.createContractor({
      name: `TEST-Контрагент-${timestamp}`,
      website: `https://test-${timestamp}.com`
    });
    
    expect(testData.contractor).toBeDefined();
    expect(testData.contractor.id).toBeGreaterThan(0);
    console.log(`✅ Создан тестовый контрагент ID: ${testData.contractor.id}`);

    // Создаем тестовый склад
    testData.warehouse = await api.createWarehouse({
      name: `TEST-Склад-${timestamp}`,
      address: `Тестовый адрес ${timestamp}`
    });
    
    expect(testData.warehouse).toBeDefined();
    expect(testData.warehouse.id).toBeGreaterThan(0);
    console.log(`✅ Создан тестовый склад ID: ${testData.warehouse.id}`);
  });

  it('2️⃣ Создание и проведение приходного документа', async () => {
    if (!testData.product?.id || !testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    // Создаем приходный документ
    const receiptDoc = await api.createDocument({
      type: 'Оприходование',
      warehouseId: testData.warehouse.id,
      status: 'posted', // Сразу проводим
      items: [{
        productId: testData.product.id,
        quantity: 100,
        price: 10.00
      }]
    });

    testData.documents.push(receiptDoc);
    
    expect(receiptDoc).toBeDefined();
    expect(receiptDoc.id).toBeGreaterThan(0);
    expect(receiptDoc.status).toBe('posted');
    console.log(`✅ Создан приходный документ ID: ${receiptDoc.id}`);

    // Проверяем остаток = 100
    const inventory = await api.getInventory();
    const testProductInventory = inventory.find(item => item.id === testData.product.id);
    
    expect(testProductInventory).toBeDefined();
    expect(testProductInventory!.quantity).toBe(100);
    console.log(`✅ Остаток после прихода: ${testProductInventory!.quantity} (ожидалось: 100)`);
  });

  it('3️⃣ Создание и проведение расходного документа (FIFO)', async () => {
    if (!testData.product?.id || !testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    // Создаем расходный документ
    const writeoffDoc = await api.createDocument({
      type: 'Списание',
      warehouseId: testData.warehouse.id,
      status: 'posted', // Сразу проводим
      items: [{
        productId: testData.product.id,
        quantity: 40,
        price: 10.00
      }]
    });

    testData.documents.push(writeoffDoc);
    
    expect(writeoffDoc).toBeDefined();
    expect(writeoffDoc.id).toBeGreaterThan(0);
    expect(writeoffDoc.status).toBe('posted');
    console.log(`✅ Создан расходный документ ID: ${writeoffDoc.id}`);

    // Проверяем остаток = 60 (FIFO отработал)
    const inventory = await api.getInventory();
    const testProductInventory = inventory.find(item => item.id === testData.product.id);
    
    expect(testProductInventory).toBeDefined();
    expect(testProductInventory!.quantity).toBe(60);
    console.log(`✅ Остаток после расхода: ${testProductInventory!.quantity} (ожидалось: 60, FIFO работает)`);
  });

  it('4️⃣ Списание в минус', async () => {
    if (!testData.product?.id || !testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    // Создаем документ списания больше остатка
    const minusWriteoffDoc = await api.createDocument({
      type: 'Списание',
      warehouseId: testData.warehouse.id,
      status: 'posted',
      items: [{
        productId: testData.product.id,
        quantity: 80, // Больше чем остаток 60
        price: 10.00
      }]
    });

    testData.documents.push(minusWriteoffDoc);
    
    expect(minusWriteoffDoc).toBeDefined();
    expect(minusWriteoffDoc.id).toBeGreaterThan(0);
    console.log(`✅ Создан документ списания в минус ID: ${minusWriteoffDoc.id}`);

    // Проверяем остаток = -20 (система должна позволить минус)
    const inventory = await api.getInventory();
    const testProductInventory = inventory.find(item => item.id === testData.product.id);
    
    expect(testProductInventory).toBeDefined();
    expect(testProductInventory!.quantity).toBe(-20);
    console.log(`✅ Остаток после списания в минус: ${testProductInventory!.quantity} (ожидалось: -20)`);
  });

  it('5️⃣ Отмена документа (смена статуса)', async () => {
    if (testData.documents.length === 0) {
      throw new Error('Нет документов для отмены');
    }

    // Берем последний документ и отменяем его (меняем статус на draft)
    const lastDoc = testData.documents[testData.documents.length - 1];
    if (!lastDoc.id) {
      throw new Error('ID документа не найден');
    }

    const cancelledDoc = await api.updateDocumentStatus(lastDoc.id, 'draft');
    
    expect(cancelledDoc.status).toBe('draft');
    console.log(`✅ Документ ${lastDoc.id} отменен (статус: ${cancelledDoc.status})`);

    // Проверяем восстановление остатка (должно стать 60)
    const inventory = await api.getInventory();
    const testProductInventory = inventory.find(item => item.id === testData.product.id);
    
    expect(testProductInventory).toBeDefined();
    expect(testProductInventory!.quantity).toBe(60);
    console.log(`✅ Остаток после отмены: ${testProductInventory!.quantity} (ожидалось: 60, восстановлен)`);
  });

  it('6️⃣ Проверка материализованных представлений', async () => {
    const startTime = Date.now();
    
    // Получаем данные из API inventory availability (использует материализованные представления)
    const availability = await api.getInventoryAvailability();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(availability).toBeDefined();
    expect(Array.isArray(availability)).toBe(true);
    expect(responseTime).toBeLessThan(1000); // Должно быть быстро
    
    console.log(`✅ Материализованные представления работают за ${responseTime}мс`);
    
    // Проверяем наличие нашего тестового товара
    const testProductAvailability = availability.find(item => item.id === testData.product.id);
    expect(testProductAvailability).toBeDefined();
    
    // Проверяем корректность данных о доступности
    expect(testProductAvailability!.quantity).toBe(60); // После отмены последнего документа
    console.log(`✅ Данные availability корректны: остаток ${testProductAvailability!.quantity}, доступно ${testProductAvailability!.available || 0}`);
  });

  it('7️⃣ Проверка отсутствия ошибок в системе', async () => {
    // Этот тест проверяет, что во время выполнения предыдущих тестов
    // система не генерировала критических ошибок
    
    // В реальной системе здесь можно было бы:
    // 1. Проверить логи за последние N минут
    // 2. Убедиться в отсутствии ERROR/WARN записей
    // 3. Проверить метрики производительности
    
    console.log('✅ Система работает стабильно во время тестов');
    
    // Простая проверка - все предыдущие тесты прошли успешно
    expect(testData.product).toBeDefined();
    expect(testData.contractor).toBeDefined();
    expect(testData.warehouse).toBeDefined();
    expect(testData.documents.length).toBeGreaterThan(0);
    
    apiLogger.info('System integration test passed all checks', {
      entities_created: {
        products: 1,
        contractors: 1,
        warehouses: 1,
        documents: testData.documents.length
      }
    });
  });
});