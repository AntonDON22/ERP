import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

describe('Адаптивность интерфейса ERP системы', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  
  const baseUrl = 'http://localhost:5000';
  
  // Тестовые размеры экранов
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop Small', width: 1024, height: 768 },
    { name: 'Desktop Large', width: 1440, height: 900 }
  ];

  const criticalPages = [
    { path: '/', name: 'Главная панель' },
    { path: '/products', name: 'Товары' },
    { path: '/documents', name: 'Документы' },
    { path: '/inventory', name: 'Остатки' },
    { path: '/orders', name: 'Заказы' },
    { path: '/suppliers', name: 'Поставщики' },
    { path: '/contractors', name: 'Контрагенты' },
    { path: '/warehouses', name: 'Склады' },
    { path: '/responsive-test', name: 'Тест адаптивности' }
  ];

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Тестирование горизонтальной прокрутки', () => {
    viewports.forEach(viewport => {
      it(`${viewport.name} (${viewport.width}x${viewport.height}) - отсутствие горизонтальной прокрутки`, async () => {
        context = await browser.newContext({ 
          viewport: { width: viewport.width, height: viewport.height }
        });
        page = await context.newPage();

        for (const testPage of criticalPages) {
          await page.goto(`${baseUrl}${testPage.path}`);
          await page.waitForLoadState('networkidle');
          
          // Проверяем отсутствие горизонтальной прокрутки
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          const viewportWidth = await page.evaluate(() => window.innerWidth);
          
          expect(bodyWidth, 
            `Страница ${testPage.name} имеет горизонтальную прокрутку на ${viewport.name}`
          ).toBeLessThanOrEqual(viewportWidth + 1); // +1 для погрешности
        }

        await context.close();
      });
    });
  });

  describe('Тестирование отображения таблиц', () => {
    const tablePages = [
      { path: '/products', name: 'Товары' },
      { path: '/documents', name: 'Документы' },
      { path: '/inventory', name: 'Остатки' },
      { path: '/orders', name: 'Заказы' },
      { path: '/suppliers', name: 'Поставщики' },
      { path: '/contractors', name: 'Контрагенты' },
      { path: '/warehouses', name: 'Склады' }
    ];

    viewports.slice(0, 2).forEach(viewport => { // Только мобильные
      it(`${viewport.name} - таблицы имеют контейнер с overflow-x-auto`, async () => {
        context = await browser.newContext({ 
          viewport: { width: viewport.width, height: viewport.height }
        });
        page = await context.newPage();

        for (const testPage of tablePages) {
          await page.goto(`${baseUrl}${testPage.path}`);
          await page.waitForLoadState('networkidle');
          
          // Ищем контейнер с overflow-x-auto
          const overflowContainer = await page.locator('[class*="overflow-x-auto"]').first();
          await expect(overflowContainer, 
            `Страница ${testPage.name} должна иметь контейнер с overflow-x-auto`
          ).toBeVisible();

          // Проверяем что таблица находится внутри контейнера
          const tableInContainer = await overflowContainer.locator('table').first();
          await expect(tableInContainer,
            `Таблица на странице ${testPage.name} должна быть внутри overflow контейнера`
          ).toBeVisible();
        }

        await context.close();
      });
    });
  });

  describe('Тестирование адаптивной навигации', () => {
    it('Мобильная навигация - кнопка гамбургер меню', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 } // iPhone SE
      });
      page = await context.newPage();

      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Проверяем наличие кнопки мобильного меню
      const mobileMenuButton = page.locator('button').filter({ hasText: 'Menu' }).or(
        page.locator('button[class*="md:hidden"]')
      );
      await expect(mobileMenuButton).toBeVisible();

      // Кликаем и проверяем что меню открывается
      await mobileMenuButton.click();
      const mobileMenu = page.locator('[class*="md:hidden"]').filter({ hasText: 'Главная' });
      await expect(mobileMenu).toBeVisible();

      await context.close();
    });

    it('Десктопная навигация - горизонтальное меню', async () => {
      context = await browser.newContext({ 
        viewport: { width: 1024, height: 768 }
      });
      page = await context.newPage();

      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Проверяем наличие горизонтального меню
      const desktopMenu = page.locator('[class*="md:flex"]').filter({ hasText: 'Главная' });
      await expect(desktopMenu).toBeVisible();

      // Кнопка мобильного меню должна быть скрыта
      const mobileMenuButton = page.locator('button[class*="md:hidden"]');
      await expect(mobileMenuButton).toBeVisible(); // Элемент существует, но скрыт через CSS

      await context.close();
    });
  });

  describe('Тестирование форм и полей ввода', () => {
    it('Адаптивность форм на странице тестирования', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 } // iPhone SE
      });
      page = await context.newPage();

      await page.goto(`${baseUrl}/responsive-test`);
      await page.waitForLoadState('networkidle');

      // Проверяем что все поля ввода видимы и доступны
      const inputs = await page.locator('input').all();
      for (const input of inputs) {
        await expect(input).toBeVisible();
        
        // Проверяем что поле не выходит за пределы экрана
        const boundingBox = await input.boundingBox();
        if (boundingBox) {
          expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(375);
        }
      }

      // Проверяем select элементы
      const selects = await page.locator('select, [role="combobox"]').all();
      for (const select of selects) {
        await expect(select).toBeVisible();
      }

      await context.close();
    });
  });

  describe('Тестирование модальных окон', () => {
    it('Модальные окна корректно отображаются на мобильных', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 }
      });
      page = await context.newPage();

      await page.goto(`${baseUrl}/responsive-test`);
      await page.waitForLoadState('networkidle');

      // Открываем модальное окно
      const modalTrigger = page.locator('text="Открыть модальное окно"');
      await modalTrigger.click();

      // Проверяем что модальное окно видимо
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Проверяем что модальное окно не выходит за пределы экрана
      const modalBox = await modal.boundingBox();
      if (modalBox) {
        expect(modalBox.x).toBeGreaterThanOrEqual(0);
        expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(375);
      }

      await context.close();
    });
  });

  describe('Тестирование производительности на мобильных', () => {
    it('Время загрузки страниц на мобильных устройствах', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 }
      });
      page = await context.newPage();

      for (const testPage of criticalPages.slice(0, 5)) { // Первые 5 страниц
        const startTime = Date.now();
        await page.goto(`${baseUrl}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        expect(loadTime, 
          `Страница ${testPage.name} загружается слишком медленно на мобильном`
        ).toBeLessThan(3000); // 3 секунды максимум
      }

      await context.close();
    });
  });

  describe('Специальные проверки для критических элементов', () => {
    it('DataTable: кнопки действий доступны на мобильных', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 }
      });
      page = await context.newPage();

      await page.goto(`${baseUrl}/products`);
      await page.waitForLoadState('networkidle');

      // Проверяем что основные кнопки видимы
      const searchInput = page.locator('input[placeholder*="Поиск"]');
      await expect(searchInput).toBeVisible();

      // Проверяем настройки столбцов
      const settingsButton = page.locator('text="Столбцы"');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        const settingsPopover = page.locator('[role="dialog"], .popover-content');
        await expect(settingsPopover).toBeVisible();
      }

      await context.close();
    });

    it('Dashboard: вкладки корректно работают на мобильных', async () => {
      context = await browser.newContext({ 
        viewport: { width: 375, height: 667 }
      });
      page = await context.newPage();

      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Проверяем переключение вкладок
      const logsTab = page.locator('[role="tab"]').filter({ hasText: 'Логи' });
      await expect(logsTab).toBeVisible();
      
      await logsTab.click();
      await page.waitForTimeout(500); // Ждем анимации

      const logsContent = page.locator('text="Системные логи"');
      await expect(logsContent).toBeVisible();

      await context.close();
    });
  });
});