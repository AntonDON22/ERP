import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import { Product, InsertProduct } from "@shared/schema";
import DataTable, { DataTableColumn, DataTableActions } from "@/components/DataTable";

export default function ProductsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Определяем колонки таблицы
  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      label: 'Название',
      width: 200,
      copyable: true,
      sortable: true,
    },
    {
      key: 'sku',
      label: 'Артикул',
      width: 120,
      copyable: true,
      sortable: true,
    },
    {
      key: 'price',
      label: 'Цена',
      width: 100,
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: 'purchasePrice',
      label: 'Цена закупки',
      width: 120,
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: 'barcode',
      label: 'Штрихкод',
      width: 140,
      copyable: true,
      sortable: true,
    },
    {
      key: 'weight',
      label: 'Вес',
      width: 100,
      sortable: true,
      render: (value) => formatWeight(value),
    },
    {
      key: 'dimensions',
      label: 'Размеры',
      width: 140,
      sortable: true,
      render: (value, row) => formatDimensions(row.length, row.width, row.height),
    },
  ];

  // Импорт товаров
  const importMutation = useMutation({
    mutationFn: async (products: InsertProduct[]) => {
      const response = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при импорте товаров");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Товары импортированы",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать товары",
        variant: "destructive",
      });
    },
  });

  // Удаление выбранных товаров
  const deleteSelectedMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const response = await fetch("/api/products/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении товаров");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Выбранные товары удалены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить товары",
        variant: "destructive",
      });
    },
  });

  // Конфигурация действий
  const actions: DataTableActions<Product> = {
    onImport: async (products: InsertProduct[]) => {
      await importMutation.mutateAsync(products);
    },
    onDeleteSelected: async (productIds: number[]) => {
      await deleteSelectedMutation.mutateAsync(productIds);
    },
    searchPlaceholder: "Поиск по названию, артикулу или штрихкоду...",
    searchFields: ['name', 'sku', 'barcode'],
    exportFileName: `товары_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
    importFields: {
      name: ['Название', 'название'],
      sku: ['Артикул', 'артикул'],
      price: ['Цена', 'цена'],
      purchasePrice: ['Цена закупки', 'цена закупки'],
      barcode: ['Штрихкод', 'штрихкод'],
      weight: ['Вес (г)', 'вес'],
      length: ['Длина (мм)', 'длина'],
      width: ['Ширина (мм)', 'ширина'],
      height: ['Высота (мм)', 'высота'],
    },
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Ошибка при загрузке товаров. Пожалуйста, попробуйте еще раз.
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      data={products}
      columns={columns}
      actions={actions}
      isLoading={isLoading}
      storageKey="productTable"
      entityName="товар"
      entityNamePlural="Товары"
    />
  );
}