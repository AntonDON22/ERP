/**
 * 🧪 Автоматический интеграционный тест системы ERP
 * 
 * Полнофункциональное тестирование всех критических операций:
 * - Создание сущностей (продукты, контрагенты, склады)
 * - FIFO инвентарь (приходные и расходные документы)
 * - Материализованные представления
 * - Здоровье системы
 */

import { describe, it, expect } from 'vitest';
import { testConfig } from '../config';
import { logger } from '../logger';
import { ErrorAggregator } from '../errorAggregator';

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

interface TestData {
  product: TestProduct | null;
  contractor: TestContractor | null;
  warehouse: TestWarehouse | null;
  receiptDocument: TestDocument | null;
  writeoffDocument: TestDocument | null;
}

/**
 * Класс для работы с API
 */
class TestAPI {
  constructor(private baseUrl: string) {}

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
  async createDocument(document: { 
    type: string; 
    name: string; 
    warehouseId: number; 
    status: 'draft' | 'posted'; 
    items: Array<{ productId: number; quantity: string; price?: string }> 
  }): Promise<TestDocument> {
    return this.request('POST', '/documents/create-receipt', document);
  }

  async updateDocumentStatus(id: number, status: 'draft' | 'posted'): Promise<TestDocument> {
    return this.request('PUT', `/documents/${id}`, { status });
  }

  async deleteDocument(id: number): Promise<void> {
    await this.request('DELETE', `/documents/${id}`);
  }

  // Инвентарь
  async getInventory(): Promise<InventoryItem[]> {
    return this.request('GET', '/inventory');
  }

  async getInventoryAvailability(): Promise<InventoryItem[]> {
    return this.request('GET', '/inventory/availability');
  }

  // Материализованные представления
  async checkMaterializedViews(): Promise<{ status: string; views: any[] }> {
    return this.request('GET', '/materialized-views/status');
  }
}

/**
 * Главный класс тестирования
 */
class SystemTester {
  private api: TestAPI;
  private errorAggregator: ErrorAggregator;
  private testData: TestData;

  constructor() {
    this.api = new TestAPI(testConfig.baseUrl);
    this.errorAggregator = new ErrorAggregator();
    this.testData = {
      product: null,
      contractor: null,
      warehouse: null,
      receiptDocument: null,
      writeoffDocument: null,
    };
  }

  /**
   * 🔹 Этап 1: Создание тестовых сущностей
   */
  private async createTestEntities(): Promise<void> {
    logger.step('Этап 1: Создание тестовых сущностей');

    // Создание продукта
    this.testData.product = await this.errorAggregator.safeExecute(
      'Создание продукта',
      async () => {
        const product = await this.api.createProduct({
          name: `TEST-Продукт-${Date.now()}`,
          sku: `TEST-SKU-${Date.now()}`,
          price: '150.50'
        });
        logger.success(`Продукт создан: ${product.name} (ID: ${product.id})`);
        return product;
      }
    );

    // Создание контрагента
    this.testData.contractor = await this.errorAggregator.safeExecute(
      'Создание контрагента',
      async () => {
        const contractor = await this.api.createContractor({
          name: `TEST-Контрагент-${Date.now()}`,
          website: 'https://test-contractor.example.com'
        });
        logger.success(`Контрагент создан: ${contractor.name} (ID: ${contractor.id})`);
        return contractor;
      }
    );

    // Создание склада
    this.testData.warehouse = await this.errorAggregator.safeExecute(
      'Создание склада',
      async () => {
        const warehouse = await this.api.createWarehouse({
          name: `TEST-Склад-${Date.now()}`,
          address: 'Тестовый адрес склада'
        });
        logger.success(`Склад создан: ${warehouse.name} (ID: ${warehouse.id})`);
        return warehouse;
      }
    );

    // Проверка создания всех сущностей
    this.errorAggregator.check(
      'Проверка создания сущностей',
      !!(this.testData.product && this.testData.contractor && this.testData.warehouse),
      'Не все тестовые сущности были созданы успешно'
    );
  }

  /**
   * 🔹 Этап 2: Приходный документ (FIFO - поступление товара)
   */
  private async createReceiptDocument(): Promise<void> {
    logger.step('Этап 2: Создание приходного документа');

    if (!this.testData.product || !this.testData.warehouse) {
      this.errorAggregator.addError('Приходный документ', 'Отсутствуют необходимые сущности для создания документа');
      return;
    }

    this.testData.receiptDocument = await this.errorAggregator.safeExecute(
      'Создание приходного документа',
      async () => {
        const document = await this.api.createDocument({
          type: 'Оприходование',
          name: `TEST-Приход-${Date.now()}`,
          warehouseId: this.testData.warehouse!.id!,
          status: 'posted',
          items: [
            {
              productId: this.testData.product!.id!,
              quantity: '100',
              price: '150.50'
            }
          ]
        });
        logger.success(`Приходный документ создан: ${document.name} (ID: ${document.id})`);
        return document;
      }
    );

    // Проверка инвентаря после прихода
    await this.errorAggregator.safeExecute(
      'Проверка инвентаря после прихода',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Небольшая пауза для обновления
        const inventory = await this.api.getInventory();
        const productInventory = inventory.find(item => item.id === this.testData.product!.id);
        
        if (productInventory && productInventory.quantity >= 100) {
          logger.success(`Инвентарь обновлен: количество ${productInventory.quantity}`);
        } else {
          throw new Error(`Неверное количество в инвентаре: ожидалось >= 100, получено ${productInventory?.quantity || 0}`);
        }
      }
    );
  }

  /**
   * 🔹 Этап 3: Расходный документ (FIFO - списание товара)
   */
  private async createWriteoffDocument(): Promise<void> {
    logger.step('Этап 3: Создание расходного документа');

    if (!this.testData.product || !this.testData.warehouse) {
      this.errorAggregator.addError('Расходный документ', 'Отсутствуют необходимые сущности для создания документа');
      return;
    }

    this.testData.writeoffDocument = await this.errorAggregator.safeExecute(
      'Создание расходного документа',
      async () => {
        const document = await this.api.createDocument({
          type: 'Списание',
          name: `TEST-Списание-${Date.now()}`,
          warehouseId: this.testData.warehouse!.id!,
          status: 'posted',
          items: [
            {
              productId: this.testData.product!.id!,
              quantity: '30'
            }
          ]
        });
        logger.success(`Расходный документ создан: ${document.name} (ID: ${document.id})`);
        return document;
      }
    );

    // Проверка FIFO инвентаря после списания
    await this.errorAggregator.safeExecute(
      'Проверка FIFO после списания',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Небольшая пауза для обновления
        const inventory = await this.api.getInventory();
        const productInventory = inventory.find(item => item.id === this.testData.product!.id);
        
        const expectedQuantity = 70; // 100 - 30
        if (productInventory && productInventory.quantity === expectedQuantity) {
          logger.success(`FIFO корректно: остаток ${productInventory.quantity}`);
        } else {
          throw new Error(`Неверный FIFO расчет: ожидалось ${expectedQuantity}, получено ${productInventory?.quantity || 0}`);
        }
      }
    );
  }

  /**
   * 🔹 Этап 4: Проверка материализованных представлений
   */
  private async checkMaterializedViews(): Promise<void> {
    logger.step('Этап 4: Проверка материализованных представлений');

    await this.errorAggregator.safeExecute(
      'Проверка статуса материализованных представлений',
      async () => {
        const startTime = Date.now();
        const status = await this.api.checkMaterializedViews();
        const duration = Date.now() - startTime;
        
        logger.success(`Материализованные представления активны (${duration}ms)`);
        logger.debug(`Статус представлений: ${JSON.stringify(status, null, 2)}`);
      }
    );

    await this.errorAggregator.safeExecute(
      'Тест производительности инвентаря',
      async () => {
        const startTime = Date.now();
        const availability = await this.api.getInventoryAvailability();
        const duration = Date.now() - startTime;
        
        if (duration < 100) {
          logger.success(`Быстрый запрос инвентаря: ${duration}ms`);
        } else {
          logger.warn(`Медленный запрос инвентаря: ${duration}ms`);
        }
        
        logger.debug(`Получено записей инвентаря: ${availability.length}`);
      }
    );
  }

  /**
   * 🔹 Этап 5: Тест отмены документа
   */
  private async testDocumentReversal(): Promise<void> {
    logger.step('Этап 5: Тест отмены документа');

    if (!this.testData.writeoffDocument) {
      this.errorAggregator.addError('Отмена документа', 'Отсутствует документ для отмены');
      return;
    }

    await this.errorAggregator.safeExecute(
      'Отмена расходного документа',
      async () => {
        await this.api.deleteDocument(this.testData.writeoffDocument!.id!);
        logger.success(`Документ ${this.testData.writeoffDocument!.name} отменен`);
      }
    );

    await this.errorAggregator.safeExecute(
      'Проверка восстановления инвентаря',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Пауза для обновления
        const inventory = await this.api.getInventory();
        const productInventory = inventory.find(item => item.id === this.testData.product!.id);
        
        const expectedQuantity = 100; // Восстановлено до исходного количества
        if (productInventory && productInventory.quantity === expectedQuantity) {
          logger.success(`Инвентарь восстановлен: ${productInventory.quantity}`);
        } else {
          throw new Error(`Неверное восстановление: ожидалось ${expectedQuantity}, получено ${productInventory?.quantity || 0}`);
        }
      }
    );
  }

  /**
   * 🔹 Этап 6: Тест здоровья системы
   */
  private async checkSystemHealth(): Promise<void> {
    logger.step('Этап 6: Проверка здоровья системы');

    await this.errorAggregator.safeExecute(
      'Доступность API',
      async () => {
        const startTime = Date.now();
        await this.api.request('GET', '/products');
        const duration = Date.now() - startTime;
        
        if (duration < 200) {
          logger.success(`API отвечает быстро: ${duration}ms`);
        } else {
          logger.warn(`API отвечает медленно: ${duration}ms`);
        }
      }
    );

    await this.errorAggregator.safeExecute(
      'Консистентность данных',
      async () => {
        const inventory = await this.api.getInventory();
        const availability = await this.api.getInventoryAvailability();
        
        const inventoryCount = inventory.length;
        const availabilityCount = availability.length;
        
        if (inventoryCount === availabilityCount) {
          logger.success(`Данные консистентны: ${inventoryCount} записей`);
        } else {
          throw new Error(`Несовпадение данных: inventory=${inventoryCount}, availability=${availabilityCount}`);
        }
      }
    );
  }

  /**
   * 🔹 Этап 7: Очистка тестовых данных
   */
  private async cleanup(): Promise<void> {
    logger.step('Этап 7: Очистка тестовых данных');

    // Удаление документов
    if (this.testData.receiptDocument) {
      await this.errorAggregator.safeExecute(
        'Удаление приходного документа',
        async () => {
          await this.api.deleteDocument(this.testData.receiptDocument!.id!);
          logger.success(`Приходный документ удален`);
        }
      );
    }

    // Удаление сущностей
    if (this.testData.product) {
      await this.errorAggregator.safeExecute(
        'Удаление продукта',
        async () => {
          await this.api.deleteProduct(this.testData.product!.id!);
          logger.success(`Продукт удален`);
        }
      );
    }

    if (this.testData.contractor) {
      await this.errorAggregator.safeExecute(
        'Удаление контрагента',
        async () => {
          await this.api.deleteContractor(this.testData.contractor!.id!);
          logger.success(`Контрагент удален`);
        }
      );
    }

    if (this.testData.warehouse) {
      await this.errorAggregator.safeExecute(
        'Удаление склада',
        async () => {
          await this.api.deleteWarehouse(this.testData.warehouse!.id!);
          logger.success(`Склад удален`);
        }
      );
    }
  }

  /**
   * Основной метод запуска всех тестов
   */
  async runAllTests(): Promise<void> {
    const startTime = Date.now();
    
    logger.header('🧪 ЗАПУСК ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ ERP СИСТЕМЫ');
    logger.info(`Конфигурация: ${testConfig.baseUrl}`);
    logger.info(`Уровень логирования: ${testConfig.logLevel}`);

    try {
      // Выполнение всех этапов тестирования
      await this.createTestEntities();
      await this.createReceiptDocument();
      await this.createWriteoffDocument();
      await this.checkMaterializedViews();
      await this.testDocumentReversal();
      await this.checkSystemHealth();
      await this.cleanup();

      // Финальный отчет
      const duration = Date.now() - startTime;
      logger.header('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
      logger.info(`Общее время выполнения: ${duration}ms`);
      logger.info(this.errorAggregator.getSummary());
      
      if (this.errorAggregator.hasErrors() || this.errorAggregator.hasWarnings()) {
        logger.info(this.errorAggregator.getDetailedReport());
      }

      // Код выхода
      process.exit(this.errorAggregator.hasErrors() ? 1 : 0);

    } catch (error) {
      logger.error(`Критическая ошибка: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    } finally {
      logger.info(`Лог файл: ${logger.getLogFile()}`);
      logger.close();
    }
  }
}

// Виtest тесты
describe('System Integration Tests', () => {
  it('should run full ERP system test', async () => {
    const tester = new SystemTester();
    
    // Мокируем process.exit для vitest
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: string | number) => {
      exitCode = typeof code === 'number' ? code : Number(code) || 0;
      return {} as never;
    }) as typeof process.exit;

    try {
      await tester.runAllTests();
      expect(exitCode).toBe(0); // Проверяем успешное завершение
    } finally {
      process.exit = originalExit;
    }
  }, 30000); // 30 секунд timeout
});

// Запуск тестирования через CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SystemTester();
  tester.runAllTests().catch(error => {
    console.error('Неожиданная ошибка:', error);
    process.exit(1);
  });
}