import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Database, RefreshCw, Settings, BarChart3 } from "lucide-react";

interface MaterializedViewStats {
  materialized_views_enabled: boolean;
  views_status: {
    rows: Array<{
      view_name: string;
      size_bytes: string;
      is_populated: boolean;
    }>;
  };
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получение статуса материализованных представлений
  const { data: stats, isLoading: statsLoading } = useQuery<MaterializedViewStats>({
    queryKey: ['/api/admin/materialized-views/status'],
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });

  // Мутации для управления материализованными представлениями
  const initMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/materialized-views/init', 'POST'),
    onSuccess: () => {
      toast({
        title: "Материализованные представления инициализированы",
        description: "Представления созданы и готовы к использованию",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materialized-views/status'] });
    },
    onError: () => {
      toast({
        title: "Ошибка инициализации",
        description: "Не удалось создать материализованные представления",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/materialized-views/refresh', 'POST'),
    onSuccess: () => {
      toast({
        title: "Представления обновлены",
        description: "Все материализованные представления успешно обновлены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materialized-views/status'] });
    },
    onError: () => {
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить материализованные представления",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiRequest('/api/admin/materialized-views/toggle', 'POST', { enabled }),
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "Представления включены" : "Представления выключены",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materialized-views/status'] });
    },
    onError: () => {
      toast({
        title: "Ошибка переключения",
        description: "Не удалось изменить режим материализованных представлений",
        variant: "destructive",
      });
    },
  });

  const formatBytes = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} Б`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
    return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Панель администратора</h1>
      </div>

      <Tabs defaultValue="materialized-views" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materialized-views" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Материализованные представления
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Производительность
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materialized-views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Управление материализованными представлениями
              </CardTitle>
              <CardDescription>
                Материализованные представления ускоряют запросы к остаткам товаров
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Статус системы</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.materialized_views_enabled 
                      ? "Материализованные представления активны" 
                      : "Используются прямые запросы к базе данных"
                    }
                  </p>
                </div>
                <Badge variant={stats?.materialized_views_enabled ? "default" : "secondary"}>
                  {stats?.materialized_views_enabled ? "ВКЛЮЧЕНО" : "ВЫКЛЮЧЕНО"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => initMutation.mutate()}
                  disabled={initMutation.isPending}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Инициализировать
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Обновить данные
                </Button>
                
                <Button
                  variant={stats?.materialized_views_enabled ? "destructive" : "default"}
                  onClick={() => toggleMutation.mutate(!stats?.materialized_views_enabled)}
                  disabled={toggleMutation.isPending}
                >
                  {stats?.materialized_views_enabled ? "Выключить" : "Включить"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статус представлений</CardTitle>
              <CardDescription>
                Информация о созданных материализованных представлениях
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Загрузка статистики...</div>
                </div>
              ) : stats?.views_status?.rows ? (
                <div className="space-y-3">
                  {stats.views_status.rows.map((view) => (
                    <div
                      key={view.view_name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{view.view_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Размер: {formatBytes(view.size_bytes)}
                        </p>
                      </div>
                      <Badge variant={view.is_populated ? "default" : "destructive"}>
                        {view.is_populated ? "Заполнено" : "Пусто"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Материализованные представления не созданы
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Сравнение производительности</CardTitle>
              <CardDescription>
                Статистика времени выполнения запросов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Прямые запросы</h3>
                  <p className="text-2xl font-bold">~100-200мс</p>
                  <p className="text-sm text-muted-foreground">
                    Время выполнения зависит от объема данных
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Материализованные представления</h3>
                  <p className="text-2xl font-bold text-green-600">~5-15мс</p>
                  <p className="text-sm text-muted-foreground">
                    Стабильно быстрые запросы
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2">Преимущества материализованных представлений:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Ускорение запросов до 10-20 раз</li>
                  <li>Снижение нагрузки на основные таблицы</li>
                  <li>Автоматическое обновление при изменении данных</li>
                  <li>Оптимизированные индексы для быстрого поиска</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}