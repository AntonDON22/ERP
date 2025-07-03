import { useMemo, useState, Suspense, lazy } from "react";
import DataTable, { ColumnConfig, ExcelExportConfig } from "../components/DataTable";
import { Warehouse } from "@shared/schema";
import { useWarehouses, useDeleteWarehouses, useImportWarehouses } from "@/hooks/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTablePerformanceAudit } from "@/hooks/usePerformanceAudit";
import { Button } from "@/components/ui/button";

// Ленивая загрузка виртуализированной таблицы
const VirtualizedDataTable = lazy(() => import("@/components/VirtualizedDataTable"));

const columns: ColumnConfig<Warehouse>[] = [
  {
    key: "name",
    label: "Название",
    minWidth: 200,
    sortable: true,
    copyable: true,
    multiline: true,
  },
  {
    key: "address",
    label: "Адрес",
    minWidth: 300,
    sortable: true,
    copyable: true,
    multiline: true,
    format: (value: unknown) => String(value || "Не указан"),
  },
];

const excelConfig: ExcelExportConfig = {
  filename: "склады",
  sheetName: "Склады",
  headers: {
    id: "ID",
    name: "Название",
    address: "Адрес",
  },
};

export default function WarehousesList() {
  const { data: warehouses = [], isLoading } = useWarehouses();
  const deleteWarehouses = useDeleteWarehouses();
  const importWarehouses = useImportWarehouses();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [useVirtualization, setUseVirtualization] = useState(warehouses.length > 20);

  // Аудит производительности таблицы
  const performanceAudit = useTablePerformanceAudit(warehouses, "WarehousesList");

  const memoizedColumns = useMemo(() => columns, []);
  const memoizedExcelConfig = useMemo(() => excelConfig, []);

  const handleDelete = async (ids: number[]) => {
    try {
      await deleteWarehouses.mutateAsync(ids);
      toast({
        title: "Успешно",
        description: `Удалено складов: ${ids.length}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить склады",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (data: unknown[]) => {
    try {
      await importWarehouses.mutateAsync(data);
      toast({
        title: "Успешно",
        description: `Импортировано складов: ${data.length}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось импортировать склады",
        variant: "destructive",
      });
    }
  };

  const handleCreate = () => {
    setLocation("/warehouses/create");
  };

  return (
    <DataTable
      data={warehouses}
      columns={memoizedColumns as ColumnConfig<unknown>[]}
      isLoading={isLoading}
      entityName="склад"
      entityNamePlural="складов"
      searchFields={["name", "address"]}
      excelConfig={memoizedExcelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
      onCreate={handleCreate}
      deleteLabel="Удалить"
      importLabel="Импорт"
      hideSelectionColumn={false}
    />
  );
}
