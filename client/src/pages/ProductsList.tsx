import { useMemo } from "react";
import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Product } from "@shared/schema";
import { useProducts, useDeleteProducts } from "@/hooks/api";
import { formatPrice, formatWeight } from "@/lib/utils";
import { ErrorAlert } from "@/components/ui-kit";

const productsColumns: ColumnConfig<Product>[] = [
  {
    key: "name",
    label: "Название",
    minWidth: 200,
    copyable: true,
    multiline: true,
  },
  {
    key: "sku",
    label: "Артикул",
    minWidth: 120,
    copyable: true,
  },
  {
    key: "price",
    label: "Цена",
    minWidth: 100,
    format: (value: unknown) => {
      if (typeof value === "string" || typeof value === "number") {
        return formatPrice(value);
      }
      return "";
    },
    className: "text-right",
  },
  {
    key: "purchasePrice",
    label: "Закупочная цена",
    minWidth: 140,
    format: (value: unknown) => {
      if (typeof value === "string" || typeof value === "number") {
        return formatPrice(value);
      }
      return "";
    },
    className: "text-right",
  },
  {
    key: "weight",
    label: "Вес",
    minWidth: 80,
    format: (value: unknown) => {
      if (typeof value === "string" || typeof value === "number") {
        return formatWeight(value);
      }
      return "";
    },
    className: "text-right",
  },
  {
    key: "length",
    label: "Длина",
    minWidth: 80,
    format: (value: unknown) => {
      if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return "";
      const formatted = num % 1 === 0 ? num.toFixed(0) : num.toString();
      return `${formatted} мм`;
    },
    className: "text-right",
  },
  {
    key: "width",
    label: "Ширина",
    minWidth: 80,
    format: (value: unknown) => {
      if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return "";
      const formatted = num % 1 === 0 ? num.toFixed(0) : num.toString();
      return `${formatted} мм`;
    },
    className: "text-right",
  },
  {
    key: "height",
    label: "Высота",
    minWidth: 80,
    format: (value: unknown) => {
      if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return "";
      const formatted = num % 1 === 0 ? num.toFixed(0) : num.toString();
      return `${formatted} мм`;
    },
    className: "text-right",
  },
  {
    key: "barcode",
    label: "Штрихкод",
    minWidth: 120,
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
  const { data: products = [], isLoading, error } = useProducts();
  const deleteProductsMutation = useDeleteProducts();

  const memoizedColumns = useMemo(() => productsColumns, []);
  const memoizedExcelConfig = useMemo(() => excelConfig, []);

  const handleDelete = async (ids: number[]) => {
    await deleteProductsMutation.mutateAsync(ids);
  };

  const handleImport = async (data: unknown[]) => {
    // TODO: Implement import logic with new API hooks
    // Production-ready: console logs removed for enterprise deployment
  };

  if (error) {
    return <ErrorAlert message="Ошибка загрузки товаров" />;
  }

  return (
    <DataTable
      data={products}
      columns={memoizedColumns}
      isLoading={isLoading}
      entityName="товар"
      entityNamePlural="Товары"
      searchFields={["name", "sku", "barcode"]}
      excelConfig={memoizedExcelConfig}
      onDelete={handleDelete}
      onImport={handleImport}
    />
  );
}
