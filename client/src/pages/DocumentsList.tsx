import { useDocuments, useDeleteDocuments } from "@/hooks/useTypedQuery";
import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Document } from "@shared/schema";

const columns: ColumnConfig<Document>[] = [
  { key: 'name', label: 'Название', width: '60%', copyable: true, multiline: true },
  { key: 'type', label: 'Тип', width: '40%', copyable: true, multiline: true },
];

const excelConfig: ExcelExportConfig = {
  filename: 'documents',
  sheetName: 'Документы',
  headers: {
    'ID': 'ID',
    'name': 'Название',
    'type': 'Тип'
  }
};

export default function DocumentsList() {
  const { data: documents = [], isLoading } = useDocuments();
  const deleteDocuments = useDeleteDocuments();

  return (
    <DataTable
      data={documents}
      columns={columns}
      isLoading={isLoading}
      entityName="документ"
      entityNamePlural="Документы"
      searchFields={['name', 'type']}
      excelConfig={excelConfig}
      onDelete={async (ids) => {
        await deleteDocuments.mutateAsync(ids);
      }}
      deleteLabel="удалить"
    />
  );
}