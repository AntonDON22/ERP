import { useDocuments, useDeleteDocuments } from "@/hooks/useTypedQuery";
import { useWarehouses } from "@/hooks/useWarehouses";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { DocumentRecord } from "@shared/schema";
import { useLocation } from "wouter";

// Создаем функцию для получения колонок с данными складов
const createColumns = (warehouses: Array<{ id: number; name: string }>): ColumnConfig<DocumentRecord>[] => [
  { key: 'name', label: 'Название', width: '35%', copyable: true, multiline: true },
  { key: 'type', label: 'Тип', width: '15%', copyable: true, multiline: true },
  { 
    key: 'warehouseId', 
    label: 'Склад', 
    width: '20%', 
    copyable: true,
    format: (value: any) => {
      if (!value) return 'Не указан';
      const warehouse = warehouses.find(w => w.id === value);
      return warehouse ? warehouse.name : `Склад ${value}`;
    }
  },
  { 
    key: 'createdAt', 
    label: 'Дата и время', 
    width: '30%', 
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
  const { data: documents = [], isLoading: documentsLoading } = useDocuments();
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const deleteDocuments = useDeleteDocuments();
  const [, setLocation] = useLocation();

  // Создаем колонки с данными складов
  const columns = createColumns(warehouses);

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
      isLoading={documentsLoading || warehousesLoading}
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