import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable, { type ColumnConfig } from "@/components/DataTable";
import { useInventory, useInventoryAvailability } from "@/hooks/useTypedQuery";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface InventoryAvailabilityItem {
  id: number;
  name: string;
  quantity: number;
  reserved: number;
  available: number;
}

const columns: ColumnConfig<InventoryAvailabilityItem>[] = [
  {
    key: "name",
    label: "Название",
    width: "50%",
    sortable: true,
    copyable: true,
    multiline: true,
  },
  {
    key: "quantity",
    label: "Остаток",
    width: "15%",
    sortable: true,
    format: (value: number) => value.toString(),
  },
  {
    key: "reserved",
    label: "Резерв",
    width: "15%",
    sortable: true,
    format: (value: number) => value.toString(),
  },
  {
    key: "available",
    label: "Доступно",
    width: "20%",
    sortable: true,
    format: (value: number) => value.toString(),
  },
];

export default function InventoryList() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: inventory = [], isLoading, refetch } = useInventoryAvailability(selectedWarehouseId);

  // Добавляем кнопку принудительного обновления для отладки
  const handleRefresh = () => {
    console.log("🔄 Принудительное обновление данных остатков");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Остатки</h1>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>
      <DataTable
        data={inventory}
        columns={columns}
        isLoading={isLoading || warehousesLoading}
        entityName="товар"
        entityNamePlural="товары"
        searchFields={["name" as keyof InventoryAvailabilityItem]}
        hideSelectionColumn={true}
        warehouseFilter={{
          selectedWarehouseId,
          warehouses,
          onWarehouseChange: setSelectedWarehouseId,
        }}
      />
    </div>
  );
}