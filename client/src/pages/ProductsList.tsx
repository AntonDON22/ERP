import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Product } from "@shared/schema";
import { useProducts, useDeleteProducts, useImportProducts } from "@/hooks/useTypedQuery";
import { formatPrice, formatWeight } from "@/lib/utils";

const productsColumns: ColumnConfig<Product>[] = [
  {
    key: "name",
    label: "Название",
    width: "w-1/4",
    copyable: true,
    multiline: true,
  },
  {
    key: "sku",
    label: "Артикул",
    width: "w-32",
    copyable: true,
  },
  {
    key: "price",
    label: "Цена",
    width: "w-24",
    format: (value) => value ? formatPrice(value) : "",
    className: "text-right",
  },
  {
    key: "purchasePrice",
    label: "Закупочная цена",
    width: "w-28",
    format: (value) => value ? formatPrice(value) : "",
    className: "text-right",
  },
  {
    key: "weight",
    label: "Вес",
    width: "w-20",
    format: (value) => value ? formatWeight(value) : "",
    className: "text-right",
  },
  {
    key: "length",
    label: "Длина",
    width: "w-20",
    format: (value) => value ? `${value} мм` : "",
    className: "text-right",
  },
  {
    key: "width",
    label: "Ширина", 
    width: "w-20",
    format: (value) => value ? `${value} мм` : "",
    className: "text-right",
  },
  {
    key: "height",
    label: "Высота",
    width: "w-20", 
    format: (value) => value ? `${value} мм` : "",
    className: "text-right",
  },
  {
    key: "barcode",
    label: "Штрихкод",
    width: "w-32",
    copyable: true,
  },
];

const excelConfig: ExcelExportConfig = {
  filename: "products",
  sheetName: "Товары",
  headers: {
    name: "Название",
    sku: "Артикул", 
    price: "Цена",
    purchasePrice: "Закупочная цена",
    weight: "Вес",
    length: "Длина",
    width: "Ширина",
    height: "Высота",
    barcode: "Штрихкод",
  },
};

export default function ProductsList() {
  const { data: products = [], isLoading } = useProducts();
  const deleteProductsMutation = useDeleteProducts();
  const importProductsMutation = useImportProducts();

  const handleDelete = async (ids: number[]) => {
    await deleteProductsMutation.mutateAsync(ids);
  };

  const handleImport = async (data: any[]) => {
    await importProductsMutation.mutateAsync(data);
  };

  return (
    <DataTable
      data={products}
      columns={productsColumns}
      isLoading={isLoading}
      entityName="товар"
      entityNamePlural="Товары"
      searchFields={["name", "sku", "barcode"]}
      excelConfig={excelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
      deleteLabel="Удалить выбранные товары"
      importLabel="Импорт товаров"
    />
  );
}