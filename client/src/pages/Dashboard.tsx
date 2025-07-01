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
      date: "2025-06-30",
      displayDate: "30 июня 2025",
      updates: [
        {
          time: "19:45",
          type: "database",
          title: "Оптимизация базы данных и FIFO",
          description: "Добавлены внешние ключи для целостности данных, созданы индексы производительности, оптимизирован FIFO алгоритм с пакетными вставками"
        },
        {
          time: "19:30",
          type: "feature", 
          title: "Мобильная навигация",
          description: "Создано адаптивное меню-гамбургер для мобильных устройств вместо горизонтальных вкладок"
        },
        {
          time: "19:15",
          type: "feature",
          title: "Полная система FIFO",
          description: "Реализовано управление запасами по принципу 'первым пришел - первым ушел' с автоматическим списанием из старых партий"
        },
        {
          time: "18:45",
          type: "feature",
          title: "Каскадное удаление документов",
          description: "При удалении документов автоматически удаляются связанные записи из таблиц позиций и остатков"
        },
        {
          time: "18:30",
          type: "feature",
          title: "Отслеживание остатков",
          description: "Документы приходования теперь обновляют остатки товаров в реальном времени с правильным расчетом"
        },
        {
          time: "18:15",
          type: "feature",
          title: "Модуль 'Остатки'",
          description: "Создан пятый модуль системы для просмотра текущих остатков товаров без возможности редактирования"
        },
        {
          time: "17:45",
          type: "feature",
          title: "Автоматические названия документов",
          description: "Документы получают названия в формате 'Тип+ID', добавлены временные метки создания"
        },
        {
          time: "17:15",
          type: "improvement",
          title: "Улучшение UI документов",
          description: "Кнопки действий перенесены в правый верхний угол, унифицированы названия"
        },
        {
          time: "17:00",
          type: "feature",
          title: "Редактирование документов",
          description: "Добавлена возможность редактирования документов через клик по строке в таблице"
        },
        {
          time: "16:30",
          type: "feature",
          title: "CRUD для документов",
          description: "Добавлены режимы создания, редактирования и просмотра в единый компонент документов"
        },
        {
          time: "16:15",
          type: "feature",
          title: "Универсальный компонент документов",
          description: "Создан конфигурируемый компонент для разных типов документов с автоматическим ценообразованием"
        },
        {
          time: "15:30",
          type: "fix",
          title: "Удаление экспорта из документов",
          description: "Убрана функция экспорта Excel из модуля документов, сделан параметр опциональным"
        },
        {
          time: "15:00",
          type: "feature",
          title: "Модуль документов",
          description: "Создан четвертый модуль для управления документами 'Оприходование' и 'Списание'"
        },
        {
          time: "14:15",
          type: "feature",
          title: "Excel импорт/экспорт с обновлением",
          description: "Реализован полный цикл Excel с ID полями для обновления существующих записей"
        },
        {
          time: "13:45",
          type: "improvement",
          title: "Рефакторинг кода",
          description: "Создан универсальный DataTable компонент, убрано дублирование кода на 50%"
        },
        {
          time: "13:00",
          type: "feature",
          title: "Модуль контрагентов",
          description: "Создана страница 'Контрагенты' с полным функционалом поиска и удаления"
        },
        {
          time: "12:30",
          type: "feature",
          title: "Создание Dashboard",
          description: "Создана главная страница с полным журналом изменений системы"
        },
        {
          time: "11:30",
          type: "database",
          title: "Таблица поставщиков",
          description: "Создана таблица поставщиков в PostgreSQL"
        },
        {
          time: "11:00",
          type: "feature",
          title: "Навигация между модулями",
          description: "Реализована маршрутизация wouter между 'Товары' и 'Поставщики'"
        },
        {
          time: "10:45",
          type: "feature",
          title: "Страница поставщиков",
          description: "Создана страница 'Поставщики' копированием структуры товаров"
        },
        {
          time: "10:00",
          type: "feature",
          title: "Массовое удаление",
          description: "Добавлены чекбоксы для выбора и массового удаления товаров"
        },
        {
          time: "09:30",
          type: "feature",
          title: "Поиск товаров",
          description: "Добавлен поиск в реальном времени по названию, артикулу и штрихкоду"
        },
        {
          time: "09:00",
          type: "database",
          title: "Миграция на PostgreSQL",
          description: "Успешно переведена система с памяти на PostgreSQL с Drizzle ORM"
        },
        {
          time: "08:30",
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