import { useQuery } from "@tanstack/react-query";
import DataTable, { type ColumnConfig } from "@/components/DataTable";

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
  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  return (
    <div className="space-y-6">
      <DataTable
        data={inventory}
        columns={columns}
        isLoading={isLoading}
        entityName="товар"
        entityNamePlural="товары"
        searchFields={["name"]}
        hideSelectionColumn={true}
      />
    </div>
  );
}