import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable, { type ColumnConfig } from "@/components/DataTable";
import { useInventory, useInventoryAvailability, useWarehouses } from "@/hooks/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    minWidth: 300,
    sortable: true,
    copyable: true,
    multiline: true,
  },
  {
    key: "quantity",
    label: "Остаток",
    minWidth: 100,
    sortable: true,
    format: (value: unknown) => Number(value)?.toString() || "0",
  },
  {
    key: "reserved",
    label: "Резерв",
    minWidth: 100,
    sortable: true,
    format: (value: unknown) => Number(value)?.toString() || "0",
  },
  {
    key: "available",
    label: "Доступно",
    minWidth: 120,
    sortable: true,
    format: (value: unknown) => Number(value || 0).toString(),
  },
];

export default function InventoryList() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: inventory = [], isLoading } = useInventoryAvailability(selectedWarehouseId);

  const memoizedColumns = useMemo(() => columns, []);

  return (
    <div className="space-y-6">
      <DataTable
        data={inventory}
        columns={memoizedColumns as ColumnConfig<unknown>[]}
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
