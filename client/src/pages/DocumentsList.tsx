import { useDocuments, useDeleteDocuments } from "@/hooks/useTypedQuery";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const columns: ColumnConfig<Document>[] = [
  { key: 'name', label: 'Название', width: '50%', copyable: true, multiline: true },
  { key: 'type', label: 'Тип', width: '30%', copyable: true, multiline: true },
  { key: 'date', label: 'Дата', width: '20%', copyable: true },
];

export default function DocumentsList() {
  const { data: documents = [], isLoading } = useDocuments();
  const deleteDocuments = useDeleteDocuments();

  const handleCreate = () => {
    // Пока ничего не делаем - просто кнопка
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Документы</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Создать
        </Button>
      </div>
      
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
      />
    </div>
  );
}