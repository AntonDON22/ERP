import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Supplier } from "@shared/schema";
import { useSuppliers, useDeleteSuppliers, useImportSuppliers } from "@/hooks/useTypedQuery";

const suppliersColumns: ColumnConfig<Supplier>[] = [
  {
    key: "name",
    label: "Название",
    width: "w-2/3",
    copyable: true,
    multiline: true,
  },
  {
    key: "website",
    label: "Вебсайт",
    width: "w-1/3",
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

  const handleDelete = async (ids: number[]) => {
    await deleteSuppliersMutation.mutateAsync(ids);
  };

  const handleImport = async (data: any[]) => {
    await importSuppliersMutation.mutateAsync(data);
  };

  return (
    <DataTable
      data={suppliers}
      columns={suppliersColumns}
      isLoading={isLoading}
      entityName="поставщик"
      entityNamePlural="Поставщики"
      searchFields={["name", "website"]}
      excelConfig={excelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
    />
  );
}