import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Search,
  Download,
  Upload,
  Trash2,
  ArrowUpDown,
  Copy,
  Check,
  Plus,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table-wrapper";
import * as XLSX from "xlsx";
import { useDebounce } from "../hooks/useDebounce";
import { ColumnConfig, ExcelExportConfig, WarehouseFilterConfig } from "./DataTable";

/**
 * 🚀 ВИРТУАЛИЗИРОВАННАЯ ТАБЛИЦА ДЛЯ БОЛЬШИХ ДАННЫХ
 * 
 * Основные оптимизации:
 * - React.memo для предотвращения ненужных ререндеров
 * - useMemo для всех тяжелых вычислений
 * - useCallback для стабильных функций
 * - Виртуализация с react-window для рендеринга только видимых строк
 * - Ленивая загрузка компонентов
 */

const ITEM_HEIGHT = 57; // Высота строки таблицы в пикселях
const HEADER_HEIGHT = 48; // Высота заголовка

// Функция для склонения в родительный падеж
function getGenitiveForm(entityNamePlural: string): string {
  const lowerCase = entityNamePlural.toLowerCase();
  const genitiveMap: Record<string, string> = {
    товары: "товаров",
    поставщики: "поставщиков",
    контрагенты: "контрагентов",
    склады: "складов",
    документы: "документов",
    заказы: "заказов",
  };
  return genitiveMap[lowerCase] || lowerCase;
}

export interface VirtualizedDataTableProps<T = unknown> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  entityName: string;
  entityNamePlural: string;
  searchFields: (keyof T | string)[];
  excelConfig?: ExcelExportConfig;
  onDelete?: (ids: number[]) => Promise<void>;
  onImport?: (data: unknown[]) => Promise<void>;
  deleteLabel?: string;
  importLabel?: string;
  onCreate?: () => void;
  onRowClick?: (item: T) => void;
  hideSelectionColumn?: boolean;
  warehouseFilter?: WarehouseFilterConfig;
  virtualizedHeight?: number; // Высота виртуализированной области
}

// Мемоизированный компонент для строки таблицы
const TableRow = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: unknown[];
    columns: ColumnConfig<unknown>[];
    selectedItems: Set<number>;
    onSelectItem: (id: number, checked: boolean) => void;
    onRowClick?: (item: unknown) => void;
    hideSelectionColumn?: boolean;
    copiedStates: Record<string, boolean>;
    onCopy: (key: string, value: string, type: string) => void;
  };
}>(({ index, style, data }) => {
  const {
    items,
    columns,
    selectedItems,
    onSelectItem,
    onRowClick,
    hideSelectionColumn,
    copiedStates,
    onCopy,
  } = data;

  const item = items[index];
  const itemId = (item as { id: number }).id;

  const handleRowClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('[role="checkbox"]') ||
      target.closest('button[role="checkbox"]') ||
      target.tagName === 'INPUT' ||
      target.getAttribute('data-state') !== null
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onRowClick?.(item);
  }, [item, onRowClick]);

  const handleSelectChange = useCallback((checked: boolean) => {
    onSelectItem(itemId, checked);
  }, [itemId, onSelectItem]);

  return (
    <div
      style={style}
      className={`flex border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        selectedItems.has(itemId) ? "bg-blue-50" : "bg-white"
      } ${onRowClick ? "cursor-pointer" : ""}`}
      onClick={handleRowClick}
    >
      {!hideSelectionColumn && (
        <div className="w-12 px-2 sm:px-4 py-3 flex items-center">
          <Checkbox
            checked={selectedItems.has(itemId)}
            onCheckedChange={handleSelectChange}
          />
        </div>
      )}
      {columns.map((column) => {
        const value = (item as Record<string | number | symbol, unknown>)[column.key];
        const formattedValue = column.format ? column.format(value) : value;
        const columnKey = String(column.key);
        const defaultWidth = column.minWidth || 150;

        return (
          <div
            key={columnKey}
            className={`px-2 sm:px-4 py-3 text-sm flex items-center ${column.className || ""}`}
            style={{ width: `${defaultWidth}px`, minWidth: `${defaultWidth}px` }}
          >
            <div className="overflow-hidden">
              {column.copyable ? (
                <CopyableCell
                  value={formattedValue ? String(formattedValue) : null}
                  type={column.label}
                  multiline={column.multiline}
                  copiedStates={copiedStates}
                  onCopy={onCopy}
                />
              ) : (
                <div 
                  className={`${
                    column.multiline 
                      ? "line-clamp-2 text-wrap break-words" 
                      : "truncate"
                  }`}
                >
                  {formattedValue ? String(formattedValue) : "—"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

TableRow.displayName = "TableRow";

// Компонент для копируемых ячеек
const CopyableCell = memo<{
  value: string | null | undefined;
  type: string;
  multiline?: boolean;
  copiedStates: Record<string, boolean>;
  onCopy: (key: string, value: string, type: string) => void;
}>(({ value, type, multiline = false, copiedStates, onCopy }) => {
  const displayValue = value || "—";
  const key = `${type}-${value}`;

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value) {
      onCopy(key, value, type);
    }
  }, [key, value, type, onCopy]);

  if (!value || value === "—") {
    return (
      <div className={multiline ? "line-clamp-2 text-wrap break-words" : "truncate"}>
        {displayValue}
      </div>
    );
  }

  return (
    <div
      onClick={handleCopy}
      className={`group cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${
        multiline ? "line-clamp-2 text-wrap break-words" : "truncate"
      }`}
      title="Нажмите для копирования"
    >
      <span className="flex items-center gap-1">
        {displayValue}
        {copiedStates[key] ? (
          <Check className="w-3 h-3 text-green-600 opacity-100" />
        ) : (
          <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    </div>
  );
});

CopyableCell.displayName = "CopyableCell";

export default function VirtualizedDataTable<T = unknown>({
  data,
  columns,
  isLoading = false,
  entityName,
  entityNamePlural,
  searchFields,
  excelConfig,
  onDelete,
  onImport,
  deleteLabel = "Удалить",
  importLabel = "Импорт",
  onCreate,
  onRowClick,
  hideSelectionColumn = false,
  warehouseFilter,
  virtualizedHeight = 400,
}: VirtualizedDataTableProps<T>) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  
  // Мемоизируем видимые столбцы
  const visibleColumns = useMemo(() => {
    return columns.filter(column => !hiddenColumns.has(String(column.key)));
  }, [columns, hiddenColumns]);

  // Функция для копирования в буфер обмена (мемоизированная)
  const copyToClipboard = useCallback(
    async (key: string, value: string, type: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedStates((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopiedStates((prev) => ({ ...prev, [key]: false }));
        }, 2000);
        toast({
          title: "Скопировано",
          description: `${type} скопирован в буфер обмена`,
        });
      } catch (err) {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать в буфер обмена",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Мемоизированная фильтрация и сортировка данных
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Применяем поиск
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = data.filter((item) =>
        searchFields.some((field) => {
          const fieldKey = String(field);
          const value = (item as Record<string, unknown>)[fieldKey];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Применяем сортировку
    return [...filtered].sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;
      const aValue = aRecord[sortField as string];
      const bValue = bRecord[sortField as string];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue), "ru", { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, debouncedSearchQuery, searchFields, sortField, sortDirection]);

  // Мемоизированная статистика
  const statisticsText = useMemo(() => {
    return `Всего ${getGenitiveForm(entityNamePlural)}: ${filteredAndSortedData.length}`;
  }, [entityNamePlural, filteredAndSortedData.length]);

  // Мемоизированные обработчики выбора
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedItems(new Set(filteredAndSortedData.map((item) => (item as { id: number }).id)));
      } else {
        setSelectedItems(new Set());
      }
    },
    [filteredAndSortedData]
  );

  const handleSelectItem = useCallback((id: number, checked: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Мемоизированная функция сортировки
  const handleSort = useCallback(
    (field: keyof T) => {
      const fieldString = String(field);
      if (sortField === fieldString) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(String(fieldString));
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  // Мемоизированные данные для виртуализированного списка
  const virtualizedData = useMemo(() => ({
    items: filteredAndSortedData,
    columns: visibleColumns as ColumnConfig<unknown>[],
    selectedItems,
    onSelectItem: handleSelectItem,
    onRowClick: onRowClick as ((item: unknown) => void) | undefined,
    hideSelectionColumn,
    copiedStates,
    onCopy: copyToClipboard,
  }), [
    filteredAndSortedData,
    visibleColumns,
    selectedItems,
    handleSelectItem,
    onRowClick,
    hideSelectionColumn,
    copiedStates,
    copyToClipboard
  ]);

  // Функция переключения видимости столбцов
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  }, []);

  const isAllSelected = selectedItems.size > 0 && selectedItems.size === filteredAndSortedData.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Панель управления */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={`Поиск ${getGenitiveForm(entityNamePlural)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Фильтр по складам */}
        {warehouseFilter && (
          <Select
            value={warehouseFilter.selectedWarehouseId?.toString() || ""}
            onValueChange={(value) => {
              warehouseFilter.onWarehouseChange(value ? parseInt(value) : undefined);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Все склады" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все склады</SelectItem>
              {warehouseFilter.warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-2">
          {onCreate && (
            <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Создать</span>
            </Button>
          )}

          {onDelete && selectedItems.size > 0 && (
            <Button 
              onClick={() => onDelete(Array.from(selectedItems))}
              variant="destructive" 
              size="sm" 
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{deleteLabel}</span>
            </Button>
          )}

          {excelConfig && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
          )}

          {onImport && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{importLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="text-sm text-gray-600">
        {statisticsText}
        {selectedItems.size > 0 && (
          <span className="ml-2 text-blue-600">
            (выбрано: {selectedItems.size})
          </span>
        )}
      </div>

      {/* Виртуализированная таблица */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Заголовок с настройками столбцов */}
        <div className="flex justify-end p-3 border-b border-gray-200">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs sm:text-sm">
                <Settings className="w-4 h-4" />
                Столбцы
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Настройка столбцов</h4>
                <div className="space-y-2">
                  {columns.map((column) => {
                    const columnKey = String(column.key);
                    const isVisible = !hiddenColumns.has(columnKey);

                    return (
                      <div key={columnKey} className="flex items-center space-x-2">
                        <Checkbox
                          id={`column-${columnKey}`}
                          checked={isVisible}
                          onCheckedChange={() => toggleColumnVisibility(columnKey)}
                        />
                        <label
                          htmlFor={`column-${columnKey}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {column.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Заголовок таблицы */}
        <div className="bg-gray-50 border-b border-gray-200 flex" style={{ height: HEADER_HEIGHT }}>
          {!hideSelectionColumn && (
            <div className="w-12 px-2 sm:px-4 py-3 flex items-center">
              <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
            </div>
          )}
          {visibleColumns.map((column) => {
            const columnKey = String(column.key);
            const defaultWidth = column.minWidth || 150;

            return (
              <div
                key={columnKey}
                className={`px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center ${column.className || ""}`}
                style={{ width: `${defaultWidth}px`, minWidth: `${defaultWidth}px` }}
              >
                {column.sortable !== false ? (
                  <button
                    onClick={() => handleSort(column.key as keyof T)}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    <span className="truncate">{column.label}</span>
                    <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                  </button>
                ) : (
                  <span className="truncate">{column.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Виртуализированный список строк */}
        <ResponsiveTableWrapper className="border-0 shadow-none bg-transparent">
          {filteredAndSortedData.length > 0 ? (
            <div style={{ height: virtualizedHeight, width: '100%' }}>
              <List
                height={virtualizedHeight}
                width="100%"
                itemCount={filteredAndSortedData.length}
                itemSize={ITEM_HEIGHT}
                itemData={virtualizedData}
              >
                {TableRow as any}
              </List>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {debouncedSearchQuery.trim() 
                ? `Не найдено ${getGenitiveForm(entityNamePlural)} по запросу "${debouncedSearchQuery}"`
                : `Нет ${getGenitiveForm(entityNamePlural)}`
              }
            </div>
          )}
        </ResponsiveTableWrapper>
      </div>
    </div>
  );
}