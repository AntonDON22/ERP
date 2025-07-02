/**
 * 🔥 СТРЕСС-ТЕСТ ERP СИСТЕМЫ
 * 
 * Создает большую нагрузку данных для проверки производительности:
 * - 1000+ товаров
 * - 500+ документов движения
 * - 200+ заказов с резервами
 * - Проверка времени отклика API
 */

import { expect, describe, it, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:5000/api';

interface StressTestResults {
  products: {
    created: number;
    avgTime: number;
    errors: number;
  };
  documents: {
    created: number;
    avgTime: number;
    errors: number;
  };
  orders: {
    created: number;
    avgTime: number;
    errors: number;
  };
  performance: {
    apiResponseTimes: number[];
    inventoryCheckTime: number;
    cacheHitRate: number;
  };
}

describe('🔥 Стресс-тест ERP системы', () => {
  let testResults: StressTestResults;
  let createdProductIds: number[] = [];
  let createdWarehouseIds: number[] = [];
  let createdContractorIds: number[] = [];

  beforeAll(async () => {
    console.log('\n🔥 ЗАПУСК СТРЕСС-ТЕСТА ERP СИСТЕМЫ');
    console.log('================================');
    
    testResults = {
      products: { created: 0, avgTime: 0, errors: 0 },
      documents: { created: 0, avgTime: 0, errors: 0 },
      orders: { created: 0, avgTime: 0, errors: 0 },
      performance: { apiResponseTimes: [], inventoryCheckTime: 0, cacheHitRate: 0 }
    };

    // Создаем базовые сущности
    await setupBaseEntities();
  });

  afterAll(async () => {
    console.log('\n📊 РЕЗУЛЬТАТЫ СТРЕСС-ТЕСТА:');
    console.log('============================');
    console.log(`✅ Товары: ${testResults.products.created} (${testResults.products.avgTime.toFixed(2)}ms среднее)`);
    console.log(`✅ Документы: ${testResults.documents.created} (${testResults.documents.avgTime.toFixed(2)}ms среднее)`);
    console.log(`✅ Заказы: ${testResults.orders.created} (${testResults.orders.avgTime.toFixed(2)}ms среднее)`);
    console.log(`📈 API Response Time: ${(testResults.performance.apiResponseTimes.reduce((a,b) => a+b, 0) / testResults.performance.apiResponseTimes.length).toFixed(2)}ms`);
    console.log(`📊 Проверка остатков: ${testResults.performance.inventoryCheckTime}ms`);
    console.log(`🎯 Cache Hit Rate: ${testResults.performance.cacheHitRate}%`);
    
    // Очистка тестовых данных
    await cleanupTestData();
  });

  it('Создание 1000+ товаров', async () => {
    console.log('\n🏭 Создание 1000+ товаров...');
    
    const startTime = Date.now();
    const batchSize = 50;
    const totalProducts = 1000;
    
    for (let batch = 0; batch < totalProducts / batchSize; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const productIndex = batch * batchSize + i + 1;
        const productData = {
          name: `Стресс-Товар-${productIndex}`,
          sku: `STRESS-${productIndex.toString().padStart(4, '0')}`,
          price: Math.floor(Math.random() * 10000) + 100,
          purchasePrice: Math.floor(Math.random() * 5000) + 50,
          weight: Math.floor(Math.random() * 1000) + 10,
          barcode: `123456789${productIndex.toString().padStart(4, '0')}`,
          dimensions: `${Math.floor(Math.random() * 50) + 1}x${Math.floor(Math.random() * 50) + 1}x${Math.floor(Math.random() * 50) + 1}`
        };

        promises.push(createProduct(productData));
      }
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          testResults.products.created++;
          createdProductIds.push(result.value.id);
        } else {
          testResults.products.errors++;
          console.error(`❌ Ошибка создания товара ${batch * batchSize + index + 1}:`, result.reason);
        }
      });
      
      console.log(`   Batch ${batch + 1}/${totalProducts / batchSize} завершен (${testResults.products.created} товаров)`);
    }
    
    const totalTime = Date.now() - startTime;
    testResults.products.avgTime = totalTime / testResults.products.created;
    
    expect(testResults.products.created).toBeGreaterThan(900);
    console.log(`✅ Создано ${testResults.products.created} товаров за ${totalTime}ms`);
  });

  it('Создание 500+ документов движения', async () => {
    console.log('\n📄 Создание 500+ документов движения...');
    
    const startTime = Date.now();
    const documentsToCreate = 500;
    const batchSize = 25;
    
    // Берем случайные товары из созданных
    const selectedProducts = createdProductIds.slice(0, 100);
    
    for (let batch = 0; batch < documentsToCreate / batchSize; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const documentType = Math.random() > 0.7 ? 'writeoff' : 'receipt';
        const productId = selectedProducts[Math.floor(Math.random() * selectedProducts.length)];
        const warehouseId = createdWarehouseIds[Math.floor(Math.random() * createdWarehouseIds.length)];
        
        const documentData = {
          type: documentType,
          warehouseId: warehouseId,
          items: [{
            productId: productId,
            quantity: Math.floor(Math.random() * 100) + 1,
            price: Math.floor(Math.random() * 1000) + 100
          }]
        };

        promises.push(createDocument(documentData));
      }
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          testResults.documents.created++;
        } else {
          testResults.documents.errors++;
        }
      });
      
      console.log(`   Документы batch ${batch + 1}: ${testResults.documents.created} создано`);
    }
    
    const totalTime = Date.now() - startTime;
    testResults.documents.avgTime = totalTime / testResults.documents.created;
    
    expect(testResults.documents.created).toBeGreaterThan(400);
    console.log(`✅ Создано ${testResults.documents.created} документов за ${totalTime}ms`);
  });

  it('Создание 200+ заказов с резервами', async () => {
    console.log('\n🛒 Создание 200+ заказов с резервами...');
    
    const startTime = Date.now();
    const ordersToCreate = 200;
    const batchSize = 20;
    
    const selectedProducts = createdProductIds.slice(0, 50);
    
    for (let batch = 0; batch < ordersToCreate / batchSize; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const contractorId = createdContractorIds[Math.floor(Math.random() * createdContractorIds.length)];
        const productId = selectedProducts[Math.floor(Math.random() * selectedProducts.length)];
        
        const orderData = {
          customerId: contractorId,
          isReserved: Math.random() > 0.5, // 50% заказов с резервом
          items: [{
            productId: productId,
            quantity: Math.floor(Math.random() * 10) + 1,
            price: Math.floor(Math.random() * 1000) + 100
          }]
        };

        promises.push(createOrder(orderData));
      }
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          testResults.orders.created++;
        } else {
          testResults.orders.errors++;
        }
      });
      
      console.log(`   Заказы batch ${batch + 1}: ${testResults.orders.created} создано`);
    }
    
    const totalTime = Date.now() - startTime;
    testResults.orders.avgTime = totalTime / testResults.orders.created;
    
    expect(testResults.orders.created).toBeGreaterThan(150);
    console.log(`✅ Создано ${testResults.orders.created} заказов за ${totalTime}ms`);
  });

  it('Проверка производительности под нагрузкой', async () => {
    console.log('\n📊 Проверка производительности под нагрузкой...');
    
    // Тест 1: Время отклика основных API
    const apiTests = [
      { name: 'GET /products', url: '/products' },
      { name: 'GET /inventory', url: '/inventory' },
      { name: 'GET /inventory/availability', url: '/inventory/availability' },
      { name: 'GET /documents', url: '/documents' },
      { name: 'GET /orders', url: '/orders' }
    ];
    
    for (const test of apiTests) {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}${test.url}`);
      const responseTime = Date.now() - startTime;
      
      testResults.performance.apiResponseTimes.push(responseTime);
      
      expect(response.ok).toBe(true);
      console.log(`   ${test.name}: ${responseTime}ms`);
    }
    
    // Тест 2: Проверка остатков с большим количеством данных
    console.log('\n   Проверка расчета остатков...');
    const inventoryStart = Date.now();
    const inventoryResponse = await fetch(`${BASE_URL}/inventory/availability`);
    testResults.performance.inventoryCheckTime = Date.now() - inventoryStart;
    
    expect(inventoryResponse.ok).toBe(true);
    const inventoryData = await inventoryResponse.json();
    console.log(`   Остатки рассчитаны для ${inventoryData.length} товаров за ${testResults.performance.inventoryCheckTime}ms`);
    
    // Тест 3: Cache Hit Rate
    const metricsResponse = await fetch(`${BASE_URL}/metrics`);
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json();
      testResults.performance.cacheHitRate = metrics.overview?.cacheHitRate || 0;
      console.log(`   Cache Hit Rate: ${testResults.performance.cacheHitRate}%`);
    }
    
    // Проверки производительности
    const avgApiTime = testResults.performance.apiResponseTimes.reduce((a,b) => a+b, 0) / testResults.performance.apiResponseTimes.length;
    expect(avgApiTime).toBeLessThan(5000); // API должно отвечать быстрее 5 секунд
    expect(testResults.performance.inventoryCheckTime).toBeLessThan(10000); // Остатки должны считаться быстрее 10 секунд
    
    console.log(`✅ Среднее время API: ${avgApiTime.toFixed(2)}ms`);
  });

  // Вспомогательные функции
  async function setupBaseEntities() {
    console.log('🔧 Создание базовых сущностей...');
    
    // Создаем тестовые склады
    for (let i = 1; i <= 5; i++) {
      const warehouse = await createWarehouse({
        name: `Стресс-Склад-${i}`,
        location: `Тестовый адрес ${i}`
      });
      createdWarehouseIds.push(warehouse.id);
    }
    
    // Создаем тестовых контрагентов
    for (let i = 1; i <= 10; i++) {
      const contractor = await createContractor({
        name: `Стресс-Контрагент-${i}`,
        website: `https://test${i}.example.com`
      });
      createdContractorIds.push(contractor.id);
    }
    
    console.log(`✅ Создано ${createdWarehouseIds.length} складов и ${createdContractorIds.length} контрагентов`);
  }

  async function cleanupTestData() {
    console.log('\n🧹 Очистка тестовых данных...');
    
    try {
      // Удаляем созданные товары (batch delete)
      if (createdProductIds.length > 0) {
        const response = await fetch(`${BASE_URL}/products/batch-delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: createdProductIds })
        });
        if (response.ok) {
          console.log(`✅ Удалено ${createdProductIds.length} товаров`);
        }
      }
    } catch (error) {
      console.log('⚠️ Ошибка очистки данных (нормально для стресс-теста)');
    }
  }

  // API вспомогательные функции
  async function createProduct(data: any) {
    const response = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  async function createWarehouse(data: any) {
    const response = await fetch(`${BASE_URL}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  async function createContractor(data: any) {
    const response = await fetch(`${BASE_URL}/contractors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  async function createDocument(data: any) {
    const response = await fetch(`${BASE_URL}/documents/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  async function createOrder(data: any) {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }
});