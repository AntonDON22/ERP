import { useMemo, useState, Suspense, lazy } from "react";
import DataTable, { ColumnConfig, ExcelExportConfig } from "@/components/DataTable";
import { Product } from "@shared/schema";
import { useProducts, useDeleteProducts } from "@/hooks/api";
import { formatPrice, formatWeight } from "@/lib/utils";
import { ErrorAlert } from "@/components/ui-kit";
import { useTablePerformanceAudit } from "@/hooks/usePerformanceAudit";
import { Button } from "@/components/ui/button";

// Ленивая загрузка виртуализированной таблицы
const VirtualizedDataTable = lazy(() => import("@/components/VirtualizedDataTable"));

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
  const [useVirtualization, setUseVirtualization] = useState(products.length > 50);

  // Аудит производительности таблицы
  const performanceAudit = useTablePerformanceAudit(products, "ProductsList");

  const memoizedColumns = useMemo(() => productsColumns, []);
  const memoizedExcelConfig = useMemo(() => excelConfig, []);

  // Автоматически включаем виртуализацию для больших данных
  useMemo(() => {
    if (products.length > 50 && !useVirtualization) {
      setUseVirtualization(true);
    }
  }, [products.length, useVirtualization]);

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

  // Определяем какую таблицу использовать
  const TableComponent = useVirtualization ? VirtualizedDataTable : DataTable;

  return (
    <div className="space-y-4">
      {/* Панель управления производительностью */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700">
            Режим отображения: {useVirtualization ? "Виртуализированная таблица" : "Обычная таблица"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Товаров: {products.length} | Ререндеров: {performanceAudit.renderCount} | 
            Последний рендер: {performanceAudit.lastRenderTime.toFixed(1)}мс
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!useVirtualization ? "default" : "outline"}
            onClick={() => setUseVirtualization(false)}
          >
            Обычная
          </Button>
          <Button
            size="sm"
            variant={useVirtualization ? "default" : "outline"}
            onClick={() => setUseVirtualization(true)}
          >
            Виртуализация
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => performanceAudit.logSummary()}
          >
            Отчет
          </Button>
        </div>
      </div>

      {/* Таблица товаров */}
      <Suspense 
        fallback={
          <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Загрузка виртуализированной таблицы...</span>
          </div>
        }
      >
        <TableComponent
          data={products}
          columns={memoizedColumns as ColumnConfig<unknown>[]}
          isLoading={isLoading}
          entityName="товар"
          entityNamePlural="Товары"
          searchFields={["name", "sku", "barcode"]}
          excelConfig={memoizedExcelConfig}
          onDelete={handleDelete}
          onImport={handleImport}
          deleteLabel="Удалить товары"
          importLabel="Импорт товаров"
          {...(useVirtualization && { virtualizedHeight: 500 })}
        />
      </Suspense>
    </div>
  );
}
