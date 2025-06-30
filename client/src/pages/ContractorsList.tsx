import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Contractor } from "@shared/schema";
import { useContractors, useDeleteContractors, useImportContractors } from "@/hooks/useTypedQuery";

const contractorsColumns: ColumnConfig<Contractor>[] = [
  {
    key: "name",
    label: "Название",
    width: "w-1/2",
    copyable: true,
    multiline: true,
  },
  {
    key: "website",
    label: "Вебсайт",
    width: "w-1/2",
    copyable: true,
  },
];

const excelConfig: ExcelExportConfig = {
  filename: "contractors",
  sheetName: "Контрагенты",
  headers: {
    name: "Название",
    website: "Вебсайт",
  },
};

export default function ContractorsList() {
  const { data: contractors = [], isLoading } = useContractors();
  const deleteContractorsMutation = useDeleteContractors();
  const importContractorsMutation = useImportContractors();

  const handleDelete = async (ids: number[]) => {
    await deleteContractorsMutation.mutateAsync(ids);
  };

  const handleImport = async (data: any[]) => {
    await importContractorsMutation.mutateAsync(data);
  };

  return (
    <DataTable
      data={contractors}
      columns={contractorsColumns}
      isLoading={isLoading}
      entityName="контрагент"
      entityNamePlural="Контрагенты"
      searchFields={["name", "website"]}
      excelConfig={excelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
      deleteLabel="Удалить выбранных контрагентов"
      importLabel="Импорт контрагентов"
    />
  );
}