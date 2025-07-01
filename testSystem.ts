#!/usr/bin/env tsx
/**
 * 🧪 Автоматический интеграционный тест системы ERP
 * 
 * Запуск: npx tsx testSystem.ts
 * Или: node --loader tsx/esm testSystem.ts
 */

// import { apiLogger } from './shared/logger.js';

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

// Класс для работы с API
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
    return this.request('POST', '/documents/create-receipt', document);
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

// Главный класс тестирования
class SystemIntegrationTest {
  private api = new TestAPI();
  private testData = {
    product: null as TestProduct | null,
    contractor: null as TestContractor | null,
    warehouse: null as TestWarehouse | null,
    documents: [] as TestDocument[],
  };
  private errors: string[] = [];
  private startTime = Date.now();

  async run(): Promise<void> {
    console.log('\n🚀 Запуск автоматического интеграционного теста системы ERP');
    console.log('=====================================');
    
    try {
      await this.step1_CreateTestEntities();
      await this.step2_CreateReceiptDocument();
      await this.step3_CreateWriteoffDocument();
      await this.step4_WriteoffToNegative();
      await this.step5_CancelDocument();
      await this.step6_CheckMaterializedViews();
      await this.step7_CheckSystemHealth();
      
      await this.cleanup();
      this.printResults();
      
    } catch (error) {
      this.errors.push(`Критическая ошибка: ${error}`);
      console.error('❌ Тест провален:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async step1_CreateTestEntities(): Promise<void> {
    console.log('\n1️⃣ Создание тестовых сущностей...');
    const timestamp = Date.now();

    try {
      // Создаем тестовый товар
      this.testData.product = await this.api.createProduct({
        name: `TEST-Товар-${timestamp}`,
        sku: `TEST-SKU-${timestamp}`,
        price: '10.00'
      });
      console.log(`   ✅ Товар создан: ID ${this.testData.product.id}`);

      // Создаем тестового контрагента  
      this.testData.contractor = await this.api.createContractor({
        name: `TEST-Контрагент-${timestamp}`,
        website: `https://test-${timestamp}.com`
      });
      console.log(`   ✅ Контрагент создан: ID ${this.testData.contractor.id}`);

      // Создаем тестовый склад
      this.testData.warehouse = await this.api.createWarehouse({
        name: `TEST-Склад-${timestamp}`,
        address: `Тестовый адрес ${timestamp}`
      });
      console.log(`   ✅ Склад создан: ID ${this.testData.warehouse.id}`);
      
    } catch (error) {
      throw new Error(`Не удалось создать тестовые сущности: ${error}`);
    }
  }

  private async step2_CreateReceiptDocument(): Promise<void> {
    console.log('\n2️⃣ Создание и проведение приходного документа...');
    
    if (!this.testData.product?.id || !this.testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    try {
      const receiptDoc = await this.api.createDocument({
        type: 'Оприходование',
        warehouseId: this.testData.warehouse.id,
        status: 'posted',
        items: [{
          productId: this.testData.product.id,
          quantity: 100,
          price: 10.00
        }]
      });

      this.testData.documents.push(receiptDoc);
      console.log(`   ✅ Приходный документ создан: ID ${receiptDoc.id}`);

      // Проверяем остаток
      const inventory = await this.api.getInventory();
      const testProductInventory = inventory.find(item => item.id === this.testData.product.id);
      
      if (!testProductInventory || testProductInventory.quantity !== 100) {
        throw new Error(`Остаток неверный: ожидалось 100, получено ${testProductInventory?.quantity || 0}`);
      }
      
      console.log(`   ✅ Остаток корректен: ${testProductInventory.quantity}`);
      
    } catch (error) {
      throw new Error(`Ошибка в приходном документе: ${error}`);
    }
  }

  private async step3_CreateWriteoffDocument(): Promise<void> {
    console.log('\n3️⃣ Создание и проведение расходного документа (FIFO)...');
    
    if (!this.testData.product?.id || !this.testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    try {
      const writeoffDoc = await this.api.createDocument({
        type: 'Списание',
        warehouseId: this.testData.warehouse.id,
        status: 'posted',
        items: [{
          productId: this.testData.product.id,
          quantity: 40,
          price: 10.00
        }]
      });

      this.testData.documents.push(writeoffDoc);
      console.log(`   ✅ Расходный документ создан: ID ${writeoffDoc.id}`);

      // Проверяем остаток после FIFO
      const inventory = await this.api.getInventory();
      const testProductInventory = inventory.find(item => item.id === this.testData.product.id);
      
      if (!testProductInventory || testProductInventory.quantity !== 60) {
        throw new Error(`FIFO работает неверно: ожидалось 60, получено ${testProductInventory?.quantity || 0}`);
      }
      
      console.log(`   ✅ FIFO работает корректно: остаток ${testProductInventory.quantity}`);
      
    } catch (error) {
      throw new Error(`Ошибка в расходном документе: ${error}`);
    }
  }

  private async step4_WriteoffToNegative(): Promise<void> {
    console.log('\n4️⃣ Списание в минус...');
    
    if (!this.testData.product?.id || !this.testData.warehouse?.id) {
      throw new Error('Тестовые данные не созданы');
    }

    try {
      const minusWriteoffDoc = await this.api.createDocument({
        type: 'Списание',
        warehouseId: this.testData.warehouse.id,
        status: 'posted',
        items: [{
          productId: this.testData.product.id,
          quantity: 80, // Больше остатка
          price: 10.00
        }]
      });

      this.testData.documents.push(minusWriteoffDoc);
      console.log(`   ✅ Документ списания в минус создан: ID ${minusWriteoffDoc.id}`);

      // Проверяем отрицательный остаток
      const inventory = await this.api.getInventory();
      const testProductInventory = inventory.find(item => item.id === this.testData.product.id);
      
      if (!testProductInventory || testProductInventory.quantity !== -20) {
        throw new Error(`Списание в минус работает неверно: ожидалось -20, получено ${testProductInventory?.quantity || 0}`);
      }
      
      console.log(`   ✅ Списание в минус работает: остаток ${testProductInventory.quantity}`);
      
    } catch (error) {
      throw new Error(`Ошибка при списании в минус: ${error}`);
    }
  }

  private async step5_CancelDocument(): Promise<void> {
    console.log('\n5️⃣ Отмена документа (смена статуса)...');
    
    if (this.testData.documents.length === 0) {
      throw new Error('Нет документов для отмены');
    }

    try {
      const lastDoc = this.testData.documents[this.testData.documents.length - 1];
      if (!lastDoc.id) {
        throw new Error('ID документа не найден');
      }

      await this.api.updateDocumentStatus(lastDoc.id, 'draft');
      console.log(`   ✅ Документ ${lastDoc.id} отменен`);

      // Проверяем восстановление остатка
      const inventory = await this.api.getInventory();
      const testProductInventory = inventory.find(item => item.id === this.testData.product!.id);
      
      if (!testProductInventory || testProductInventory.quantity !== 60) {
        throw new Error(`Отмена документа работает неверно: ожидалось 60, получено ${testProductInventory?.quantity || 0}`);
      }
      
      console.log(`   ✅ Остаток восстановлен: ${testProductInventory.quantity}`);
      
    } catch (error) {
      throw new Error(`Ошибка при отмене документа: ${error}`);
    }
  }

  private async step6_CheckMaterializedViews(): Promise<void> {
    console.log('\n6️⃣ Проверка материализованных представлений...');
    
    try {
      const startTime = Date.now();
      const availability = await this.api.getInventoryAvailability();
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        this.errors.push(`Материализованные представления медленные: ${responseTime}мс`);
      }
      
      console.log(`   ✅ Ответ получен за ${responseTime}мс`);
      
      // Проверяем наличие нашего товара
      const testProductAvailability = availability.find(item => item.id === this.testData.product!.id);
      if (!testProductAvailability) {
        throw new Error('Тестовый товар не найден в данных availability');
      }
      
      if (testProductAvailability.quantity !== 60) {
        throw new Error(`Данные availability неверны: ожидалось 60, получено ${testProductAvailability.quantity}`);
      }
      
      console.log(`   ✅ Данные availability корректны: остаток ${testProductAvailability.quantity}`);
      
    } catch (error) {
      throw new Error(`Ошибка проверки материализованных представлений: ${error}`);
    }
  }

  private async step7_CheckSystemHealth(): Promise<void> {
    console.log('\n7️⃣ Проверка здоровья системы...');
    
    // В реальной системе здесь можно проверить:
    // - Логи на наличие ошибок
    // - Метрики производительности
    // - Состояние базы данных
    
    const totalTime = Date.now() - this.startTime;
    if (totalTime > 5000) {
      this.errors.push(`Тест выполняется слишком долго: ${totalTime}мс`);
    }
    
    console.log(`   ✅ Общее время выполнения: ${totalTime}мс`);
    console.log(`   ✅ Ошибок системы: ${this.errors.length}`);
    
    console.log(`   ✅ Система протестирована: ${this.testData.documents.length} документов`);
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Очистка тестовых данных...');
    
    let cleanupErrors = 0;

    // Удаляем документы
    for (const doc of this.testData.documents) {
      if (doc.id) {
        try {
          await this.api.deleteDocument(doc.id);
          console.log(`   ✅ Документ ${doc.id} удален`);
        } catch (error) {
          console.warn(`   ⚠️ Не удалось удалить документ ${doc.id}: ${error}`);
          cleanupErrors++;
        }
      }
    }

    // Удаляем созданные сущности
    if (this.testData.product?.id) {
      try {
        await this.api.deleteProduct(this.testData.product.id);
        console.log(`   ✅ Товар ${this.testData.product.id} удален`);
      } catch (error) {
        console.warn(`   ⚠️ Не удалось удалить товар: ${error}`);
        cleanupErrors++;
      }
    }

    if (this.testData.contractor?.id) {
      try {
        await this.api.deleteContractor(this.testData.contractor.id);
        console.log(`   ✅ Контрагент ${this.testData.contractor.id} удален`);
      } catch (error) {
        console.warn(`   ⚠️ Не удалось удалить контрагента: ${error}`);
        cleanupErrors++;
      }
    }

    if (this.testData.warehouse?.id) {
      try {
        await this.api.deleteWarehouse(this.testData.warehouse.id);
        console.log(`   ✅ Склад ${this.testData.warehouse.id} удален`);
      } catch (error) {
        console.warn(`   ⚠️ Не удалось удалить склад: ${error}`);
        cleanupErrors++;
      }
    }

    // Обновляем статистику ошибок очистки
    if (cleanupErrors > 0) {
      console.log(`\n⚠️  Предупреждений при очистке: ${cleanupErrors}`);
    } else {
      console.log(`\n✨ Очистка завершена без ошибок`);
    }
  }

  private printResults(): void {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📊 РЕЗУЛЬТАТЫ ИНТЕГРАЦИОННОГО ТЕСТА');
    console.log('=====================================');
    console.log(`⏱️  Общее время выполнения: ${totalTime}мс`);
    console.log(`📄 Создано документов: ${this.testData.documents.length}`);
    console.log(`⚠️  Предупреждений: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️ Предупреждения:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (this.errors.length === 0 && totalTime < 5000) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
      console.log('   Система работает корректно');
    } else {
      console.log('\n⚠️ ТЕСТ ЗАВЕРШЕН С ПРЕДУПРЕЖДЕНИЯМИ');
    }
    
    console.log('\n');
  }
}

// Запуск теста
async function main() {
  const test = new SystemIntegrationTest();
  await test.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SystemIntegrationTest };