import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Clock, Wrench, Bug, Zap, Database, Activity, RefreshCw, Filter, Search, AlertCircle, User, MessageSquare, Copy, Check, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Update {
  type: "feature" | "fix" | "improvement" | "database";
  title: string;
  description: string;
}

interface DayData {
  date: string;
  displayDate: string;
  updates: Update[];
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  module: string;
  details?: string;
}

export default function Dashboard() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    level: 'all',
    module: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // История изменений
  const { data: changelog, isLoading: changelogLoading } = useQuery<DayData[]>({
    queryKey: ['/api/changelog'],
  });

  // Логи
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<LogEntry[]>({
    queryKey: ['/api/logs'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  const { data: modules } = useQuery<string[]>({
    queryKey: ['/api/logs/modules'],
  });

  const toggleSection = (date: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(date)) {
      newOpenSections.delete(date);
    } else {
      newOpenSections.add(date);
    }
    setOpenSections(newOpenSections);
  };

  const getUpdateIcon = (type: Update['type']) => {
    switch (type) {
      case 'feature':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'fix':
        return <Bug className="w-4 h-4 text-red-600" />;
      case 'improvement':
        return <Wrench className="w-4 h-4 text-green-600" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getUpdateBadge = (type: Update['type']) => {
    const variants = {
      feature: { variant: "default" as const, text: "Новое" },
      fix: { variant: "destructive" as const, text: "Исправление" },
      improvement: { variant: "secondary" as const, text: "Улучшение" },
      database: { variant: "outline" as const, text: "База данных" }
    };
    
    const config = variants[type];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    );
  };

  // Логика для логов
  const getLevelBadge = (level: LogEntry['level']) => {
    const variants = {
      DEBUG: { variant: "outline" as const, icon: MessageSquare, color: "text-gray-600" },
      INFO: { variant: "default" as const, icon: Clock, color: "text-blue-600" },
      WARN: { variant: "secondary" as const, icon: AlertCircle, color: "text-yellow-600" },
      ERROR: { variant: "destructive" as const, icon: AlertCircle, color: "text-red-600" }
    };
    
    const config = variants[level];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className={`w-3 h-3 ${config.color}`} />
        {level}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
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

  const CopyableText = ({ text, type }: { text: string; type: string }) => {
    const key = `${type}-${text}`;
    const isCopied = copiedStates[key];

    return (
      <div className="group flex items-start gap-2">
        <span className="flex-1 text-sm leading-relaxed break-words">
          {text}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-auto p-1"
          onClick={() => copyToClipboard(text, type)}
        >
          {isCopied ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3 text-gray-500" />
          )}
        </Button>
      </div>
    );
  };

  // Фильтрация логов
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter((log: LogEntry) => {
      if (filters.level && filters.level !== 'all' && log.level !== filters.level) {
        return false;
      }
      
      if (filters.module && filters.module !== 'all' && log.module !== filters.module) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return log.message.toLowerCase().includes(searchLower) ||
               log.module.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }, [logs, filters]);

  // Пагинация для логов
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Сброс страницы при изменении фильтров
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleRefresh = () => {
    refetchLogs();
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">Главная панель</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Мониторинг системы и история обновлений</p>
      </div>

      <Tabs defaultValue="updates" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="updates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Обновления</span>
            <span className="sm:hidden">Обновл.</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Логи</span>
            <span className="sm:hidden">Логи</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                История изменений
              </CardTitle>
            </CardHeader>
            <CardContent>
              {changelogLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Загрузка истории изменений...</div>
                </div>
              ) : !changelog || changelog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  История изменений не найдена
                </div>
              ) : (
                <div className="space-y-4">
                  {changelog.map((day) => (
                    <Collapsible
                      key={day.date}
                      open={openSections.has(day.date)}
                      onOpenChange={() => toggleSection(day.date)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {openSections.has(day.date) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{day.displayDate}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {day.updates.length} обновлений
                        </Badge>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-2">
                        <div className="pl-6 space-y-3">
                          {day.updates.map((update, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              {getUpdateIcon(update.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{update.title}</h4>
                                  {getUpdateBadge(update.type)}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {update.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Системные логи
                </CardTitle>
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={logsLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Фильтры */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Уровень</label>
                  <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
                    <SelectTrigger className="text-xs sm:text-sm">
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

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Модуль</label>
                  <Select value={filters.module} onValueChange={(value) => setFilters(prev => ({ ...prev, module: value }))}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Все модули" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все модули</SelectItem>
                      {modules?.map((module) => (
                        <SelectItem key={module} value={module}>
                          {module}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-xs sm:text-sm font-medium">Поиск</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                    <Input
                      placeholder="Поиск по сообщению..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8 sm:pl-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Статистика */}
              {logs && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Ошибки</div>
                    <div className="text-base sm:text-lg font-semibold text-red-600">
                      {filteredLogs.filter((log: LogEntry) => log.level === 'ERROR').length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Предупр.</div>
                    <div className="text-base sm:text-lg font-semibold text-yellow-600">
                      {filteredLogs.filter((log: LogEntry) => log.level === 'WARN').length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Информ.</div>
                    <div className="text-base sm:text-lg font-semibold text-blue-600">
                      {filteredLogs.filter((log: LogEntry) => log.level === 'INFO').length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Всего</div>
                    <div className="text-base sm:text-lg font-semibold">
                      {filteredLogs.length}
                    </div>
                  </div>
                </div>
              )}

              {/* Записи логов */}
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Загрузка логов...</div>
                </div>
              ) : !logs || logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Логи не найдены</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Попробуйте изменить фильтры или обновить страницу
                  </p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Записи не найдены</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Попробуйте изменить фильтры или обновить страницу
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentLogs.map((log: LogEntry) => (
                    <div key={log.id} className="bg-white border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{formatTimestamp(log.timestamp)}</span>
                          </div>
                          
                          {getLevelBadge(log.level)}
                          
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <User className="w-3 h-3" />
                            <span className="hidden sm:inline">{log.module}</span>
                            <span className="sm:hidden">{log.module.substring(0, 3)}</span>
                          </Badge>
                        </div>
                        
                        <Badge variant="secondary" className="text-xs">
                          #{log.id}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <CopyableText text={log.message} type="сообщение" />
                      </div>
                      
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

              {/* Пагинация для логов */}
              {filteredLogs.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4 border-t">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}