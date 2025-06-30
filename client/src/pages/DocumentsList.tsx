import { useDocuments, useDeleteDocuments } from "@/hooks/useTypedQuery";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { DocumentRecord } from "@shared/schema";
import { useLocation } from "wouter";

const columns: ColumnConfig<DocumentRecord>[] = [
  { key: 'name', label: 'Название', width: '40%', copyable: true, multiline: true },
  { key: 'type', label: 'Тип', width: '20%', copyable: true, multiline: true },
  { 
    key: 'createdAt', 
    label: 'Дата и время', 
    width: '40%', 
    copyable: true,
    format: (value: any) => {
      if (!value) return '';
      const date = new Date(value);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  },
];

export default function DocumentsList() {
  const { data: documents = [], isLoading } = useDocuments();
  const deleteDocuments = useDeleteDocuments();
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    setLocation("/documents/create-receipt");
  };

  const handleRowClick = (document: DocumentRecord) => {
    setLocation(`/documents/${document.id}`);
  };

  return (
    <DataTable
      data={documents}
      columns={columns}
      isLoading={isLoading}
      entityName="документ"
      entityNamePlural="Документы"
      searchFields={['name', 'type', 'date']}
      onDelete={async (ids) => {
        await deleteDocuments.mutateAsync(ids);
      }}
      onCreate={handleCreate}
      onRowClick={handleRowClick}
    />
  );
}