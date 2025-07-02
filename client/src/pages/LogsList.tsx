import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Search, AlertCircle, Clock, User, MessageSquare, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
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
    level: 'all',
    module: 'all',
    search: ''
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Получаем логи
  const { data: logs, isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ['/api/logs'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  // Получаем список модулей
  const { data: modules } = useQuery<string[]>({
    queryKey: ['/api/logs/modules'],
  });

  // Функция форматирования времени
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Показываем дату и время
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  // Функция копирования в буфер обмена
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${type}-${text}`;
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  // Функция получения badge для уровня
  const getLevelBadge = (level: string) => {
    const variants = {
      DEBUG: { variant: "secondary" as const, className: "bg-gray-100 text-gray-800" },
      INFO: { variant: "default" as const, className: "bg-blue-100 text-blue-800" },
      WARN: { variant: "outline" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      ERROR: { variant: "destructive" as const, className: "bg-red-100 text-red-800" }
    };
    
    const config = variants[level as keyof typeof variants] || variants.INFO;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {level}
      </Badge>
    );
  };

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

  // Пагинация
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Сброс страницы при изменении фильтров
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleRefresh = () => {
    refetch();
  };

  const clearFilters = () => {
    setFilters({ level: 'all', module: 'all', search: '' });
  };

  // Компонент для копируемого текста
  const CopyableText = ({ text, type }: { text: string; type: string }) => {
    const key = `${type}-${text}`;
    const isCopied = copiedStates[key];
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="flex-1">{text}</span>
        <button
          onClick={() => copyToClipboard(text, type)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
          title={`Копировать ${type.toLowerCase()}`}
        >
          {isCopied ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Системные логи</h1>
          <p className="text-gray-600 mt-1">Просмотр и анализ журналов системы</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
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
                  {modules?.map((module: string) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="mt-1">
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
            <div className="text-2xl font-bold">
              {filteredLogs.length}
            </div>
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
            <div className="text-2xl font-bold text-blue-600">
              {filteredLogs.filter((log: LogEntry) => log.level === 'INFO').length}
            </div>
            <p className="text-sm text-gray-600">Информация</p>
          </CardContent>
        </Card>
      </div>

      {/* Список логов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Журнал событий
            {filteredLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Загрузка логов...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Логи не найдены</p>
              <p className="text-sm text-gray-500 mt-1">
                Попробуйте изменить фильтры или обновить страницу
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {currentLogs.map((log: LogEntry) => (
                <div key={log.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  {/* Заголовок записи */}
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                      
                      {getLevelBadge(log.level)}
                      
                      <Badge variant="outline" className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.module}
                      </Badge>
                    </div>
                    
                    <Badge variant="secondary" className="text-xs">
                      #{log.id}
                    </Badge>
                  </div>
                  
                  {/* Сообщение */}
                  <div className="mb-3">
                    <CopyableText text={log.message} type="сообщение" />
                  </div>
                  
                  {/* Детали */}
                  {log.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Показать детали
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{log.details}</pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Пагинация */}
        {filteredLogs.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t">
            <div className="text-sm text-gray-700">
              Показано {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} из {filteredLogs.length} записей
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
              
              <span className="text-sm text-gray-700">
                Страница {currentPage} из {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Вперед
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}