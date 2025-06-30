import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle, Info } from "lucide-react";

interface SystemUpdate {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  description: string;
  timestamp: string;
  category: string;
}

export default function Dashboard() {
  const { data: updates = [], isLoading } = useQuery<SystemUpdate[]>({
    queryKey: ['/api/system-updates'],
    staleTime: 30000, // 30 секунд
    refetchInterval: 60000, // Обновлять каждую минуту
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Панель управления
        </h1>
        <p className="text-gray-600">
          Актуальная информация о состоянии системы и важных обновлениях
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Системные обновления
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Загрузка обновлений...
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Новых обновлений нет
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {getIcon(update.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {update.title}
                      </h3>
                      <Badge variant={getBadgeVariant(update.type) as any}>
                        {update.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {update.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(update.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}