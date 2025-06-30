import { useDocuments, useDeleteDocuments } from "@/hooks/useTypedQuery";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { Document } from "@shared/schema";

const columns: ColumnConfig<Document>[] = [
  { key: 'name', label: 'Название', width: '60%', copyable: true, multiline: true },
  { key: 'type', label: 'Тип', width: '40%', copyable: true, multiline: true },
];

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
      onDelete={async (ids) => {
        await deleteDocuments.mutateAsync(ids);
      }}
      deleteLabel="удалить"
    />
  );
}