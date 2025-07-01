import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable, { type ColumnConfig } from "@/components/DataTable";
import { useInventory } from "@/hooks/useTypedQuery";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
}

const columns: ColumnConfig<InventoryItem>[] = [
  {
    key: "name",
    label: "Название",
    width: "70%",
    sortable: true,
    copyable: true,
    multiline: true,
  },
  {
    key: "quantity",
    label: "Остаток",
    width: "30%",
    sortable: true,
    format: (value: number) => value.toString(),
  },
];

export default function InventoryList() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: inventory = [], isLoading } = useInventory(selectedWarehouseId);

  return (
    <div className="space-y-6">
      <DataTable
        data={inventory}
        columns={columns}
        isLoading={isLoading || warehousesLoading}
        entityName="товар"
        entityNamePlural="товары"
        searchFields={["name"]}
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