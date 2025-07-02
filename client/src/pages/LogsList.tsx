import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../components/DataTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  module: string;
  details?: string;
}

export default function LogsList() {
  const [filters, setFilters] = useState({
    level: '',
    module: '',
    search: ''
  });

  // Получение списка модулей для фильтра
  const { data: modules = [] } = useQuery<string[]>({
    queryKey: ['/api/logs/modules'],
    staleTime: 5 * 60 * 1000, // Кешируем на 5 минут
  });

  // Получение логов с фильтрацией  
  const { data: logs = [], isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ['/api/logs', filters],
    staleTime: 0, // Всегда обновляем логи
  });

  // Определяем цвет для каждого уровня лога
  const getLevelBadge = (level: string) => {
    const variants = {
      DEBUG: "default",
      INFO: "secondary", 
      WARN: "default",
      ERROR: "destructive"
    } as const;
    
    const colors = {
      DEBUG: "text-blue-600",
      INFO: "text-green-600",
      WARN: "text-yellow-600", 
      ERROR: "text-red-600"
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || "default"}>
        <span className={colors[level as keyof typeof colors] || ""}>
          {level}
        </span>
      </Badge>
    );
  };

  // Форматирование времени для отображения
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru });
    } catch {
      return timestamp;
    }
  };

  // Определяем колонки таблицы
  const columns = useMemo(() => [
    {
      key: "timestamp",
      label: "Время",
      width: "150px",
      format: (timestamp: string) => formatTimestamp(timestamp),
      copyable: true,
    },
    {
      key: "level",
      label: "Уровень", 
      width: "100px",
      format: (level: string) => level,
    },
    {
      key: "module",
      label: "Модуль",
      width: "120px",
      format: (module: string) => module,
      copyable: true,
    },
    {
      key: "message",
      label: "Сообщение",
      width: "400px",
      format: (message: string) => message,
      copyable: true,
      multiline: true,
    },
    {
      key: "details",
      label: "Детали",
      width: "150px",
      format: (details: string | null) => {
        if (!details || details === null) return '';
        try {
          const parsed = JSON.parse(details);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return String(details);
        }
      },
    },
  ], []);

  // Фильтрация логов
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter((log: LogEntry) => {
      // Фильтр по уровню
      if (filters.level && filters.level !== 'all' && log.level !== filters.level) {
        return false;
      }
      
      // Фильтр по модулю
      if (filters.module && filters.module !== 'all' && log.module !== filters.module) {
        return false;
      }
      
      // Поиск по тексту
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return log.message.toLowerCase().includes(searchLower) ||
               log.module.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }, [logs, filters]);

  const handleRefresh = () => {
    refetch();
  };

  const clearFilters = () => {
    setFilters({ level: '', module: '', search: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Логи системы</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Поиск по сообщению или модулю..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Уровень</label>
              <Select 
                value={filters.level} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Все уровни" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Модуль</label>
              <Select 
                value={filters.module} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, module: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Все модули" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все модули</SelectItem>
                  {modules.map((module: string) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Очистить фильтры
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-sm text-gray-600">Всего записей</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter((log: LogEntry) => log.level === 'ERROR').length}
            </div>
            <p className="text-sm text-gray-600">Ошибки</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredLogs.filter((log: LogEntry) => log.level === 'WARN').length}
            </div>
            <p className="text-sm text-gray-600">Предупреждения</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredLogs.filter((log: LogEntry) => log.level === 'INFO').length}
            </div>
            <p className="text-sm text-gray-600">Информация</p>
          </CardContent>
        </Card>
      </div>

      {/* Таблица логов */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredLogs}
            columns={columns}
            entityName="лог"
            entityNamePlural="логи"
            searchFields={["message", "module"]}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}