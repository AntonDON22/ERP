import { useState, useRef, useCallback, useMemo } from "react";
import { Search, Download, Upload, Trash2, ArrowUpDown, Copy, Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { useDebounce } from "../hooks/useDebounce";

// Функция для склонения в родительный падеж
function getGenitiveForm(entityNamePlural: string): string {
  const lowerCase = entityNamePlural.toLowerCase();
  
  // Словарь склонений
  const genitiveMap: Record<string, string> = {
    'товары': 'товаров',
    'поставщики': 'поставщиков', 
    'контрагенты': 'контрагентов',
    'склады': 'складов',
    'документы': 'документов',
    'заказы': 'заказов'
  };
  
  return genitiveMap[lowerCase] || lowerCase;
}

// Типы для конфигурации колонок
export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  copyable?: boolean;
  multiline?: boolean;
  format?: (value: any) => string;
  className?: string;
}

// Типы для экспорта Excel
export interface ExcelExportConfig {
  filename: string;
  sheetName: string;
  headers: Record<string, string>;
}

export interface WarehouseFilterConfig {
  selectedWarehouseId?: number;
  warehouses: Array<{ id: number; name: string }>;
  onWarehouseChange: (warehouseId: number | undefined) => void;
}

// Основные пропсы компонента
export interface DataTableProps<T extends { id: number; name: string }> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  entityName: string;
  entityNamePlural: string;
  searchFields: (keyof T)[];
  excelConfig?: ExcelExportConfig;
  onDelete?: (ids: number[]) => Promise<void>;
  onImport?: (data: any[]) => Promise<void>;
  deleteLabel?: string;
  importLabel?: string;
  onCreate?: () => void;
  onRowClick?: (item: T) => void;
  hideSelectionColumn?: boolean;
  warehouseFilter?: WarehouseFilterConfig;
}

// Компонент для копируемых ячеек
const CopyableCell = ({ 
  value, 
  type, 
  multiline = false,
  copiedStates,
  onCopy 
}: { 
  value: string | null | undefined; 
  type: string; 
  multiline?: boolean;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, type: string) => void;
}) => {
  if (!value) return <span className="text-gray-400">-</span>;
  
  const key = `${type}-${value}`;
  const isCopied = copiedStates[key];
  
  return (
    <div className="flex items-start gap-2 group">
      <span className={multiline ? "flex-1 break-words" : "truncate"}>{value}</span>
      <button
        onClick={() => onCopy(value, type)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded flex-shrink-0 mt-0.5"
        title={`Копировать ${type.toLowerCase()}`}
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-green-600" />
        ) : (
          <Copy className="w-3 h-3 text-gray-500" />
        )}
      </button>
    </div>
  );
};

export default function DataTable<T extends { id: number; name: string }>({
  data,
  columns,
  isLoading,
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
  warehouseFilter
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof T>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Функция копирования в буфер обмена
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${type}-${text}`;
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
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
  }, [toast]);

  // Фильтрация и сортировка данных
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Применяем поиск
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = data.filter((item) => 
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Применяем сортировку
    return [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue), 'ru', { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, debouncedSearchQuery, searchFields, sortField, sortDirection]);

  // Функции для работы с выбором
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredAndSortedData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredAndSortedData]);

  const handleSelectItem = useCallback((id: number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Функция сортировки
  const handleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  // Функция удаления
  const handleDelete = useCallback(async () => {
    if (!onDelete || selectedItems.size === 0) return;

    try {
      await onDelete(Array.from(selectedItems));
      setSelectedItems(new Set());
      toast({
        title: "Успешно",
        description: `Удалено ${selectedItems.size} ${entityName.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить ${entityNamePlural.toLowerCase()}`,
        variant: "destructive",
      });
    }
  }, [onDelete, selectedItems, entityName, entityNamePlural, toast]);

  // Функция экспорта в Excel
  const handleExport = useCallback(() => {
    if (!excelConfig) return;
    
    const exportData = filteredAndSortedData.map((item) => {
      const exportItem: Record<string, any> = {};
      
      // Добавляем ID как первую колонку
      exportItem['ID'] = item.id;
      
      // Добавляем остальные колонки
      columns.forEach(column => {
        const value = item[column.key];
        const formattedValue = column.format ? column.format(value) : value;
        exportItem[excelConfig.headers[String(column.key)] || String(column.label)] = formattedValue || "";
      });
      return exportItem;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, excelConfig.sheetName);
    XLSX.writeFile(workbook, `${excelConfig.filename}.xlsx`);

    toast({
      title: "Экспорт завершен",
      description: `Данные экспортированы в файл ${excelConfig.filename}.xlsx`,
    });
  }, [filteredAndSortedData, columns, excelConfig, toast]);

  // Функция импорта из Excel
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImport) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      await onImport(jsonData);

      toast({
        title: "Импорт завершен",
        description: `Импортировано ${jsonData.length} записей`,
      });
    } catch (error) {
      toast({
        title: "Ошибка импорта",
        description: "Не удалось импортировать данные из файла",
        variant: "destructive",
      });
    }

    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onImport, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const isAllSelected = filteredAndSortedData.length > 0 && selectedItems.size === filteredAndSortedData.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < filteredAndSortedData.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Заголовок и статистика */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entityNamePlural.charAt(0).toUpperCase() + entityNamePlural.slice(1)}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Всего {getGenitiveForm(entityNamePlural)}: {filteredAndSortedData.length}
            </p>
          </div>
        </div>

      {/* Панель управления */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Поиск ${entityNamePlural.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {warehouseFilter && (
          <div className="min-w-48">
            <Select
              value={warehouseFilter.selectedWarehouseId?.toString() || "all"}
              onValueChange={(value) => {
                warehouseFilter.onWarehouseChange(value === "all" ? undefined : parseInt(value));
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Все склады" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {warehouseFilter.warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onCreate && (
            <Button
              variant="default"
              size="sm"
              onClick={onCreate}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать
            </Button>
          )}

          {selectedItems.size > 0 && onDelete && !hideSelectionColumn && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLabel} ({selectedItems.size})
            </Button>
          )}

          {excelConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </Button>
          )}

          {onImport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {importLabel}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {!hideSelectionColumn && (
                  <th className="w-12 px-4 py-3 text-left">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || 'w-auto'} ${column.className || ''}`}
                  >
                    {column.sortable !== false ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                      >
                        {column.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedItems.has(item.id) ? "bg-blue-50" : ""
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={(e) => {
                    // Не обрабатываем клик если это чекбокс
                    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                      return;
                    }
                    onRowClick?.(item);
                  }}
                >
                  {!hideSelectionColumn && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = item[column.key];
                    const formattedValue = column.format ? column.format(value) : value;
                    
                    return (
                      <td
                        key={String(column.key)}
                        className={`px-4 py-3 text-sm ${column.className || ''}`}
                      >
                        {column.copyable ? (
                          <CopyableCell
                            value={formattedValue ? String(formattedValue) : null}
                            type={column.label}
                            multiline={column.multiline}
                            copiedStates={copiedStates}
                            onCopy={copyToClipboard}
                          />
                        ) : (
                          <span className={column.multiline ? "break-words" : "truncate"}>
                            {formattedValue ? String(formattedValue) : <span className="text-gray-400">-</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {debouncedSearchQuery ? `Нет результатов для "${debouncedSearchQuery}"` : `Нет ${entityNamePlural.toLowerCase()}`}
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}