import DataTable, { ColumnConfig, ExcelExportConfig } from "../components/DataTable";
import { Warehouse } from "@shared/schema";
import { useWarehouses, useDeleteWarehouses, useImportWarehouses } from "@/hooks/useWarehouses";
import { useToast } from "@/hooks/use-toast";

const columns: ColumnConfig<Warehouse>[] = [
  {
    key: "name",
    label: "Название",
    width: "60%",
    sortable: true,
    copyable: true,
    multiline: true,
  },
  {
    key: "address", 
    label: "Адрес",
    width: "40%",
    sortable: true,
    copyable: true,
    multiline: true,
    format: (value) => value || "Не указан",
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

  const handleImport = async (data: any[]) => {
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

  return (
    <DataTable
      data={warehouses}
      columns={columns}
      isLoading={isLoading}
      entityName="склад"
      entityNamePlural="складов"
      searchFields={["name", "address"]}
      excelConfig={excelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
      deleteLabel="Удалить"
      importLabel="Импорт"
      hideSelectionColumn={false}
    />
  );
}