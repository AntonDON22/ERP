import { Clock, Wrench, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const updates = [
    {
      date: "30 июня 2025",
      time: "16:16",
      type: "improvement",
      title: "Упрощение главной страницы",
      description: "Убраны лишние блоки с описанием системы. Теперь главная страница содержит только историю обновлений для удобства просмотра изменений."
    },
    {
      date: "30 июня 2025",
      time: "16:11",
      type: "feature",
      title: "Перенос названий на 2 строки",
      description: "Длинные названия товаров и поставщиков теперь отображаются в две строки с красивым обрезанием. Увеличена высота строк до 20px для лучшего отображения."
    },
    {
      date: "30 июня 2025", 
      time: "16:07",
      type: "fix",
      title: "Исправлена проблема прыгающего интерфейса",
      description: "Полностью убрана функциональность изменения размера столбцов. Таблицы теперь имеют статичные фиксированные размеры, что устранило проблему с прыжками при переключении между вкладками."
    },
    {
      date: "30 июня 2025",
      time: "15:45", 
      type: "feature",
      title: "Упрощена таблица поставщиков",
      description: "Оставлены только два столбца: 'Название' и 'Вебсайт'. Статистика изменена на формат 'Всего поставщиков' для соответствия странице товаров."
    },
    {
      date: "30 июня 2025",
      time: "15:30",
      type: "feature", 
      title: "Создана таблица поставщиков в PostgreSQL",
      description: "Добавлена база данных для поставщиков с полями name и website. Все данные теперь хранятся в PostgreSQL вместо памяти."
    },
    {
      date: "30 июня 2025",
      time: "15:15",
      type: "feature",
      title: "Навигация между Товары и Поставщики", 
      description: "Реализована маршрутизация с wouter для переключения между страницами 'Товары' и 'Поставщики' через верхние вкладки."
    },
    {
      date: "30 июня 2025",
      time: "14:50",
      type: "feature",
      title: "Поддержка touch-событий для мобильных",
      description: "Добавлена поддержка изменения ширины столбцов через сенсорные жесты на iPhone и других мобильных устройствах."
    },
    {
      date: "30 июня 2025", 
      time: "14:30",
      type: "feature",
      title: "Массовое удаление товаров",
      description: "Реализована возможность выбора нескольких товаров через чекбоксы и их массового удаления одной кнопкой."
    },
    {
      date: "30 июня 2025",
      time: "14:15",
      type: "feature", 
      title: "Изменение ширины столбцов",
      description: "Добавлена возможность изменять ширину столбцов в таблице товаров с сохранением настроек в localStorage."
    },
    {
      date: "30 июня 2025",
      time: "13:45",
      type: "feature",
      title: "Поиск по товарам",
      description: "Реализован поиск в реальном времени по названию, артикулу и штрихкоду товаров с отображением результатов."
    },
    {
      date: "30 июня 2025",
      time: "13:20", 
      type: "improvement",
      title: "Упрощение интерфейса товаров",
      description: "Убраны все кнопки создания и редактирования. Оставлена только функциональность просмотра товаров, поиска и экспорта в Excel."
    },
    {
      date: "30 июня 2025",
      time: "12:50",
      type: "database",
      title: "Миграция на PostgreSQL",
      description: "Успешно переведена система хранения с памяти на PostgreSQL с использованием Drizzle ORM. Все данные теперь персистентны."
    },
    {
      date: "30 июня 2025", 
      time: "12:00",
      type: "improvement",
      title: "Удаление полей категории и описания",
      description: "Упрощена модель товаров - полностью убраны поля категории и описания из всех компонентов и схемы базы данных."
    },
    {
      date: "30 июня 2025",
      time: "11:30", 
      type: "feature",
      title: "Инициализация проекта",
      description: "Создана базовая система управления товарами с React TypeScript frontend и Express.js backend. Настроены все основные компоненты и структура проекта."
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
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "feature":
        return "Новая функция";
      case "fix":
        return "Исправление";
      case "improvement": 
        return "Улучшение";
      case "database":
        return "База данных";
      default:
        return "Обновление";
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-green-50 border-green-200";
      case "fix":
        return "bg-blue-50 border-blue-200"; 
      case "improvement":
        return "bg-orange-50 border-orange-200";
      case "database":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Changelog */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            История обновлений
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {updates.map((update, index) => (
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
                        {update.date} в {update.time}
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
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Последнее обновление: 30 июня 2025 в 16:11</p>
      </div>
    </div>
  );
}