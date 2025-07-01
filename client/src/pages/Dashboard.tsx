import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  
  const { data: dayData = [], isLoading, error } = useQuery<DayData[]>({
    queryKey: ['/api/changelog'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
    staleTime: 0 // Всегда считать данные устаревшими для свежести
  });

  const toggleDay = (date: string) => {
    setExpandedDays(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка истории обновлений...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Ошибка загрузки истории обновлений</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "fix":
        return <Wrench className="w-4 h-4 text-orange-600" />;
      case "database":
        return <Database className="w-4 h-4 text-purple-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-green-700 bg-green-100";
      case "fix":
        return "text-orange-700 bg-orange-100";
      case "database":
        return "text-purple-700 bg-purple-100";
      default:
        return "text-blue-700 bg-blue-100";
    }
  };

  const totalUpdates = dayData.reduce((sum, day) => sum + day.updates.length, 0);
  const developmentDays = dayData.length;
  const avgUpdatesPerDay = developmentDays > 0 ? (totalUpdates / developmentDays).toFixed(1) : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-7 h-7 text-blue-600" />
          История обновлений системы
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalUpdates}</div>
            <div className="text-sm text-blue-700">Всего обновлений</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{developmentDays}</div>
            <div className="text-sm text-green-700">Дней разработки</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{avgUpdatesPerDay}</div>
            <div className="text-sm text-purple-700">В среднем за день</div>
          </div>
        </div>

        <div className="space-y-4">
          {dayData.map((day) => (
            <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleDay(day.date)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {expandedDays.includes(day.date) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <span className="font-semibold text-gray-900">{day.displayDate}</span>
                  <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                    {day.updates.length} обновлений
                  </span>
                </div>
              </button>
              
              {expandedDays.includes(day.date) && (
                <div className="p-4 space-y-4 bg-white">
                  {day.updates.map((update, index) => (
                    <div key={index} className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(update.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-600">{update.time}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(update.type)}`}>
                            {update.type === "feature" ? "Функция" : 
                             update.type === "fix" ? "Исправление" :
                             update.type === "database" ? "База данных" : "Улучшение"}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{update.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{update.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}