import React, { useState, useMemo } from "react";
import { Search, Package, Calendar, MapPin, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAllShipments } from "@/hooks/api/useShipments";

interface ShipmentWithDetails {
  id: number;
  orderId: number;
  date: string;
  status: string;
  warehouseId: number;
  comments?: string;
  orderName?: string;
  warehouseName?: string;
  itemsCount?: number;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  prepared: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
  shipped: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
  delivered: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
};

const statusLabels = {
  draft: "Черновик",
  prepared: "Подготовлено",
  shipped: "Отгружено",
  delivered: "Доставлено",
  cancelled: "Отменено",
};

export function ShipmentsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: allShipments = [], isLoading } = useAllShipments();

  // Фильтрация отгрузок
  const filteredShipments = useMemo(() => {
    return allShipments.filter((shipment: ShipmentWithDetails) => {
      const matchesSearch = 
        shipment.orderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === "all" || shipment.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [allShipments, searchTerm, selectedStatus]);

  // Статистика отгрузок
  const stats = useMemo(() => {
    const total = allShipments.length;
    const byStatus = Object.keys(statusLabels).reduce((acc, status) => {
      acc[status] = allShipments.filter((s: ShipmentWithDetails) => s.status === status).length;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus };
  }, [allShipments]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Загрузка отгрузок...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Отгрузки
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Всего отгрузок: {stats.total}
          </p>
        </div>
      </div>

      {/* Статистика по статусам */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Всего
            </div>
          </CardContent>
        </Card>
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.byStatus[status] || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Поиск по заказу, складу, комментариям..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="all">Все статусы</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Список отгрузок */}
      <div className="space-y-4">
        {filteredShipments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Отгрузки не найдены</p>
            </CardContent>
          </Card>
        ) : (
          filteredShipments.map((shipment: ShipmentWithDetails) => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-lg">
                        {shipment.orderName || `Заказ #${shipment.orderId}`}
                      </span>
                      <Badge className={statusColors[shipment.status as keyof typeof statusColors]}>
                        {statusLabels[shipment.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(shipment.date).toLocaleDateString("ru-RU")}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{shipment.warehouseName}</span>
                      </div>
                      
                      {shipment.comments && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="truncate max-w-xs">{shipment.comments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Отгрузка</div>
                      <div className="font-semibold">#{shipment.id}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default ShipmentsList;