import { useMemo } from "react";
import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Supplier } from "@shared/schema";
import { useSuppliers, useDeleteSuppliers, useImportSuppliers } from "@/hooks/api";
import { useLocation } from "wouter";

const suppliersColumns: ColumnConfig<Supplier>[] = [
  {
    key: "name",
    label: "Название",
    minWidth: 300,
    copyable: true,
    multiline: true,
  },
  {
    key: "website",
    label: "Вебсайт",
    minWidth: 200,
    copyable: true,
  },
];

const excelConfig: ExcelExportConfig = {
  filename: "suppliers",
  sheetName: "Поставщики",
  headers: {
    name: "Название",
    website: "Вебсайт",
  },
};

export default function SuppliersList() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSuppliersMutation = useDeleteSuppliers();
  const importSuppliersMutation = useImportSuppliers();
  const [, setLocation] = useLocation();

  const memoizedColumns = useMemo(() => suppliersColumns, []);
  const memoizedExcelConfig = useMemo(() => excelConfig, []);

  const handleDelete = async (ids: number[]) => {
    await deleteSuppliersMutation.mutateAsync(ids);
  };

  const handleImport = async (data: unknown[]) => {
    await importSuppliersMutation.mutateAsync(data);
  };

  const handleCreate = () => {
    setLocation("/suppliers/create");
  };

  return (
    <DataTable
      data={suppliers}
      columns={memoizedColumns as ColumnConfig<unknown>[]}
      isLoading={isLoading}
      entityName="поставщик"
      entityNamePlural="Поставщики"
      searchFields={["name", "website"]}
      excelConfig={memoizedExcelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
      onCreate={handleCreate}
    />
  );
}
