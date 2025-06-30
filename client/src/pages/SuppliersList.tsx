import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Supplier, InsertSupplier } from "@shared/schema";
import DataTable, { DataTableColumn, DataTableActions } from "@/components/DataTable";

export default function SuppliersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Определяем колонки таблицы
  const columns: DataTableColumn<Supplier>[] = [
    {
      key: 'name',
      label: 'Название',
      width: 300,
      copyable: true,
      sortable: true,
    },
    {
      key: 'website',
      label: 'Веб-сайт',
      width: 250,
      copyable: true,
      sortable: true,
    },
  ];

  // Импорт поставщиков
  const importMutation = useMutation({
    mutationFn: async (suppliers: InsertSupplier[]) => {
      const response = await fetch("/api/suppliers/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suppliers }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при импорте поставщиков");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Поставщики импортированы",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать поставщиков",
        variant: "destructive",
      });
    },
  });

  // Удаление выбранных поставщиков
  const deleteSelectedMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      const response = await fetch("/api/suppliers/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ supplierIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении поставщиков");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Выбранные поставщики удалены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить поставщиков",
        variant: "destructive",
      });
    },
  });

  // Конфигурация действий
  const actions: DataTableActions<Supplier> = {
    onImport: async (suppliers: InsertSupplier[]) => {
      await importMutation.mutateAsync(suppliers);
    },
    onDeleteSelected: async (supplierIds: number[]) => {
      await deleteSelectedMutation.mutateAsync(supplierIds);
    },
    searchPlaceholder: "Поиск по названию или веб-сайту...",
    searchFields: ['name', 'website'],
    exportFileName: `поставщики_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
    importFields: {
      name: ['Название', 'название'],
      website: ['Веб-сайт', 'веб-сайт', 'website'],
    },
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Ошибка при загрузке поставщиков. Пожалуйста, попробуйте еще раз.
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      data={suppliers}
      columns={columns}
      actions={actions}
      isLoading={isLoading}
      storageKey="supplierTable"
      entityName="поставщик"
      entityNamePlural="Поставщики"
    />
  );
}