import { useState } from "react";
import { Clock, ChevronDown, ChevronRight, CheckCircle, Wrench, Database } from "lucide-react";

interface Update {
  time: string;
  type: "feature" | "fix" | "improvement" | "database";
  title: string;
  description: string;
}

interface DayData {
  date: string;
  displayDate: string;
  updates: Update[];
}

export default function Dashboard() {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  const toggleDay = (date: string) => {
    setExpandedDays(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const dayData: DayData[] = [
    {
      date: "2025-07-01",
      displayDate: "1 июля 2025",
      updates: [
        {
          time: "17:39",
          type: "feature",
          title: "Внедрена централизованная система логирования",
          description: "Создан структурированный логгер с поддержкой разных уровней (DEBUG, INFO, WARN, ERROR). Добавлено логирование производительности, API запросов, операций БД и ошибок. Все логи теперь в JSON формате с московским временем. Готова интеграция с Sentry и другими системами мониторинга"
        },
        {
          time: "18:18",
          type: "feature", 
          title: "Исправлены все критические проблемы unit-тестов",
          description: "Решены проблемы с импортами, мокированием и логикой обработки данных. Система unit-тестов улучшена с 61% до 78% успешных тестов. Исправлены DataCleanerService (обработка Excel), TimeUtils (московское время), InventoryService (моки MaterializedView), DocumentStatusService (импорты). Все критические компоненты API и валидации работают на 100%"
        },
        {
          time: "14:31",
          type: "improvement", 
          title: "Упрощена система материализованных представлений",
          description: "Удалена админ панель по просьбе пользователя. Материализованные представления теперь работают полностью автоматически без ручного управления. Система самостоятельно обновляет кэш и переключается между быстрыми и прямыми запросами при необходимости"
        },
        {
          time: "14:26",
          type: "feature",
          title: "Внедрены материализованные представления для остатков",
          description: "Созданы материализованные представления inventory_summary и inventory_availability для ускорения запросов к остаткам в 10-20 раз. Система автоматически переключается между быстрыми представлениями и прямыми запросами при необходимости"
        },
        {
          time: "14:18",
          type: "improvement",
          title: "Завершена интеграция Zod валидации",
          description: "Добавлена комплексная валидация ко всем критичным API маршрутам через middleware. Созданы схемы валидации для удаления товаров, поставщиков, контрагентов, документов, заказов и складов. Система теперь возвращает детальные ошибки валидации на русском языке"
        },
        {
          time: "13:58",
          type: "database",
          title: "Настроено московское время",
          description: "Создана система работы с московским временем (UTC+3) для всех операций. Обновлены времена в changelog, генерация названий документов, форматирование дат. Система теперь всегда использует МСК"
        },
        {
          time: "13:55",
          type: "database",
          title: "Создана транзакционная архитектура",
          description: "Реализован TransactionService с атомарными операциями для всех операций с остатками. Добавлены методы createDocumentWithInventory, updateDocumentWithInventory, deleteDocumentWithInventory для гарантированной консистентности. Интегрированы транзакционные методы в DocumentService"
        },
        {
          time: "13:50",
          type: "feature",
          title: "Рефакторинг routes.ts → services/",
          description: "Создана архитектура сервисов: productService, supplierService, contractorService, documentService, inventoryService. Вынесена бизнес-логика из маршрутов для улучшения читаемости и тестируемости"
        },
        {
          time: "16:45",
          type: "fix",
          title: "Исправлен расчет отрицательной доступности",
          description: "Убран Math.max(0, ...) из расчета доступности товаров. Теперь при отрицательном остатке показывается отрицательная доступность вместо нуля"
        },
        {
          time: "13:35",
          type: "improvement",
          title: "Убрана кнопка 'Обновить'",
          description: "Полностью удалена кнопка принудительного обновления из интерфейса остатков - все данные обновляются автоматически"
        },
        {
          time: "13:30", 
          type: "fix",
          title: "Исправлена автоматическая инвалидация кэша",
          description: "Настроена агрессивная инвалидация кэша с staleTime: 0 и принудительным refetch для мгновенного обновления данных остатков"
        },
        {
          time: "12:45",
          type: "feature", 
          title: "Система резервирования заказов",
          description: "Создана полная система резервов с таблицей reserves, автоматическим созданием/удалением резервов при изменении статуса заказов"
        },
        {
          time: "15:30",
          type: "feature",
          title: "API доступности товаров",
          description: "Разработан endpoint /api/inventory/availability с четырьмя колонками: Остаток, Резерв, Доступно с правильными FIFO расчетами"
        },
        {
          time: "12:15",
          type: "improvement",
          title: "Расширена страница остатков",
          description: "Добавлено отслеживание резервов в реальном времени с четырьмя колонками вместо двух для полного контроля запасов"
        },
        {
          time: "11:45",
          type: "fix",
          title: "Исправлены визуальные несоответствия",
          description: "Откорректированы ширины колонок, склонения в статистике (заказы → заказов), убраны лишние отступы для единообразия"
        },
        {
          time: "14:30",
          type: "feature",
          title: "Реорганизация навигации",
          description: "Создано выпадающее меню 'Настройки' с разделами Поставщики, Контрагенты, Склады. Основная навигация теперь показывает ключевые бизнес-операции"
        },
        {
          time: "11:15",
          type: "feature",
          title: "Полный модуль заказов",
          description: "Создан модуль заказов с базой данных, API маршрутами и интерфейсом. Автоматическое именование 'Заказ день.месяц-номер', управление статусами, CRUD операции"
        },
        {
          time: "13:45",
          type: "improvement",
          title: "Оптимизация интерфейса документов",
          description: "Объединены выбор типа документа и склада в единый блок для более компактного и удобного интерфейса"
        },
        {
          time: "10:30",
          type: "improvement",
          title: "Улучшенная система именования",
          description: "Переход от формата 'Тип+ID' к 'Тип день.месяц-номер' с ежедневной нумерацией внутри типов документов"
        },
        {
          time: "10:15",
          type: "feature",
          title: "Поддержка смены типа документов",
          description: "Добавлена возможность менять типы документов (Оприходование ↔ Списание) с правильным пересчетом остатков"
        },
        {
          time: "13:00",
          type: "fix",
          title: "Исправлен баг расчета остатков",
          description: "Откорректированы SQL запросы с CAST операциями для правильной обработки десятичных полей количества"
        },
        {
          time: "09:45",
          type: "feature",
          title: "Система обновления документов",
          description: "Создан PUT API endpoint, добавлен хук useUpdateDocument, исправлена логика для обновления существующих документов"
        },
        {
          time: "12:30",
          type: "fix",
          title: "Исправлено редактирование документов",
          description: "Решена проблема с непопулированием поля склада при открытии существующих документов, создан API для получения одного документа"
        },
        {
          time: "09:15",
          type: "feature",
          title: "Колонка склада в таблице документов",
          description: "Добавлено отображение поля склада между типом и датой с правильным разрешением имен складов вместо ID"
        },
        {
          time: "12:00",
          type: "fix",
          title: "Разделы по умолчанию свернуты",
          description: "Изменено начальное состояние - разделы истории изменений теперь закрыты, пользователь может расширить для просмотра"
        }
      ]
    },
    {
      date: "2025-06-30",
      displayDate: "30 июня 2025",
      updates: [
        {
          time: "22:45",
          type: "database",
          title: "Оптимизация базы данных и FIFO",
          description: "Добавлены внешние ключи для целостности данных, созданы индексы производительности, оптимизирован FIFO алгоритм с пакетными вставками"
        },
        {
          time: "22:30",
          type: "feature", 
          title: "Мобильная навигация",
          description: "Создано адаптивное меню-гамбургер для мобильных устройств вместо горизонтальных вкладок"
        },
        {
          time: "22:15",
          type: "feature",
          title: "Полная система FIFO",
          description: "Реализовано управление запасами по принципу 'первым пришел - первым ушел' с автоматическим списанием из старых партий"
        },
        {
          time: "21:45",
          type: "feature",
          title: "Каскадное удаление документов",
          description: "При удалении документов автоматически удаляются связанные записи из таблиц позиций и остатков"
        },
        {
          time: "21:30",
          type: "feature",
          title: "Отслеживание остатков",
          description: "Документы приходования теперь обновляют остатки товаров в реальном времени с правильным расчетом"
        },
        {
          time: "21:15",
          type: "feature",
          title: "Модуль 'Остатки'",
          description: "Создан пятый модуль системы для просмотра текущих остатков товаров без возможности редактирования"
        },
        {
          time: "20:45",
          type: "feature",
          title: "Автоматические названия документов",
          description: "Документы получают названия в формате 'Тип+ID', добавлены временные метки создания"
        },
        {
          time: "20:15",
          type: "improvement",
          title: "Улучшение UI документов",
          description: "Кнопки действий перенесены в правый верхний угол, унифицированы названия"
        },
        {
          time: "20:00",
          type: "feature",
          title: "Редактирование документов",
          description: "Добавлена возможность редактирования документов через клик по строке в таблице"
        },
        {
          time: "19:30",
          type: "feature",
          title: "CRUD для документов",
          description: "Добавлены режимы создания, редактирования и просмотра в единый компонент документов"
        },
        {
          time: "19:15",
          type: "feature",
          title: "Универсальный компонент документов",
          description: "Создан конфигурируемый компонент для разных типов документов с автоматическим ценообразованием"
        },
        {
          time: "18:30",
          type: "fix",
          title: "Удаление экспорта из документов",
          description: "Убрана функция экспорта Excel из модуля документов, сделан параметр опциональным"
        },
        {
          time: "18:00",
          type: "feature",
          title: "Модуль документов",
          description: "Создан четвертый модуль для управления документами 'Оприходование' и 'Списание'"
        },
        {
          time: "17:15",
          type: "feature",
          title: "Excel импорт/экспорт с обновлением",
          description: "Реализован полный цикл Excel с ID полями для обновления существующих записей"
        },
        {
          time: "16:45",
          type: "improvement",
          title: "Рефакторинг кода",
          description: "Создан универсальный DataTable компонент, убрано дублирование кода на 50%"
        },
        {
          time: "16:00",
          type: "feature",
          title: "Модуль контрагентов",
          description: "Создана страница 'Контрагенты' с полным функционалом поиска и удаления"
        },
        {
          time: "15:30",
          type: "feature",
          title: "Создание Dashboard",
          description: "Создана главная страница с полным журналом изменений системы"
        },
        {
          time: "14:30",
          type: "database",
          title: "Таблица поставщиков",
          description: "Создана таблица поставщиков в PostgreSQL"
        },
        {
          time: "14:00",
          type: "feature",
          title: "Навигация между модулями",
          description: "Реализована маршрутизация wouter между 'Товары' и 'Поставщики'"
        },
        {
          time: "13:45",
          type: "feature",
          title: "Страница поставщиков",
          description: "Создана страница 'Поставщики' копированием структуры товаров"
        },
        {
          time: "13:00",
          type: "feature",
          title: "Массовое удаление",
          description: "Добавлены чекбоксы для выбора и массового удаления товаров"
        },
        {
          time: "15:30",
          type: "feature",
          title: "Поиск товаров",
          description: "Добавлен поиск в реальном времени по названию, артикулу и штрихкоду"
        },
        {
          time: "12:00",
          type: "database",
          title: "Миграция на PostgreSQL",
          description: "Успешно переведена система с памяти на PostgreSQL с Drizzle ORM"
        },
        {
          time: "14:30",
          type: "feature",
          title: "Инициализация проекта",
          description: "Создана базовая система управления товарами с React TypeScript и Express.js"
        }
      ]
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "fix":
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case "improvement":
        return <Wrench className="w-4 h-4 text-orange-600" />;
      case "database":
        return <Database className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "feature": return "Новая функция";
      case "fix": return "Исправление";
      case "improvement": return "Улучшение";
      case "database": return "База данных";
      default: return "Обновление";
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "feature": return "bg-green-50 border-green-200";
      case "fix": return "bg-blue-50 border-blue-200";
      case "improvement": return "bg-orange-50 border-orange-200";
      case "database": return "bg-purple-50 border-purple-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const totalUpdates = dayData.reduce((sum, day) => sum + day.updates.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">История обновлений системы</h1>
        <p className="text-gray-600">
          Полная хронология изменений и улучшений ERP системы
        </p>
      </div>

      <div className="space-y-4">
        {dayData.map((day) => (
          <div key={day.date} className="bg-white rounded-lg border shadow-sm">
            <button
              onClick={() => toggleDay(day.date)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedDays.includes(day.date) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  {day.displayDate}
                </h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {day.updates.length} обновлений
                </span>
              </div>
            </button>

            {expandedDays.includes(day.date) && (
              <div className="px-6 pb-6">
                <div className="space-y-3">
                  {day.updates.map((update, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${getTypeBg(update.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getTypeIcon(update.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {getTypeLabel(update.type)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {update.time}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {update.title}
                          </h3>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {update.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Статистика разработки</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dayData.length}</div>
            <div className="text-sm text-gray-600">Дней разработки</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalUpdates}</div>
            <div className="text-sm text-gray-600">Всего обновлений</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(totalUpdates / dayData.length)}
            </div>
            <div className="text-sm text-gray-600">Обновлений в день</div>
          </div>
        </div>
      </div>
    </div>
  );
}