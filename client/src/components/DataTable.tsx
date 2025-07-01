import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Search, Download, Upload, Trash2, ArrowUpDown, Copy, Check, Plus, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  minWidth?: number;
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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [forceRender, setForceRender] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const { toast } = useToast();

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Уникальные ключи для localStorage для каждой таблицы
  const widthStorageKey = `dataTable-${entityName}-columnWidths`;
  const hiddenStorageKey = `dataTable-${entityName}-hiddenColumns`;

  // Загрузка ширины столбцов при монтировании
  useEffect(() => {
    const savedWidths = localStorage.getItem(widthStorageKey);
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.warn("Failed to parse saved column widths");
      }
    }
    // Очищаем все старые настройки ширины для сброса к минимальным значениям
    // Этот код можно удалить после первого запуска на всех клиентах
    const now = Date.now();
    const resetKey = 'dataTable-reset-to-min-width';
    const lastReset = localStorage.getItem(resetKey);
    if (!lastReset || now - parseInt(lastReset) > 24 * 60 * 60 * 1000) { // 24 часа
      // Очищаем только настройки ширины столбцов, сохраняем видимость
      Object.keys(localStorage).forEach(key => {
        if (key.includes('dataTable-') && key.includes('-columnWidths')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(resetKey, now.toString());
      setColumnWidths({});
    }
  }, [widthStorageKey]);

  // Загрузка скрытых столбцов при монтировании
  useEffect(() => {
    const savedHidden = localStorage.getItem(hiddenStorageKey);
    if (savedHidden) {
      try {
        setHiddenColumns(new Set(JSON.parse(savedHidden)));
      } catch (e) {
        console.warn("Failed to parse saved hidden columns");
      }
    }
  }, [hiddenStorageKey]);

  // Сохранение ширины столбцов при изменении
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      localStorage.setItem(widthStorageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths, widthStorageKey]);

  // Сохранение скрытых столбцов при изменении
  useEffect(() => {
    localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns, hiddenStorageKey]);

  // Функция для начала изменения размера
  const startResize = useCallback((columnKey: string, event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(columnKey);
  }, []);

  // Функция для обработки изменения размера
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing || !tableRef.current) return;

    const table = tableRef.current;
    const columnHeader = table.querySelector(`th[data-column="${isResizing}"]`) as HTMLElement;
    
    if (!columnHeader) return;

    const currentColumn = columns.find(col => String(col.key) === isResizing);
    const minWidth = currentColumn?.minWidth || 150;
    
    const mouseX = event.clientX;
    const headerRect = columnHeader.getBoundingClientRect();
    const newWidth = Math.max(minWidth, mouseX - headerRect.left);

    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  }, [isResizing, columns]);

  // Функция для завершения изменения размера
  const stopResize = useCallback(() => {
    setIsResizing(null);
  }, []);

  // Обработчики событий мыши
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, stopResize]);

  // Функция для переключения видимости столбца
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
    // Принудительно перерендерим таблицу
    setForceRender(prev => prev + 1);
  }, []);

  // Фильтруем видимые столбцы
  const visibleColumns = useMemo(() => {
    return columns.filter(column => !hiddenColumns.has(String(column.key)));
  }, [columns, hiddenColumns]);

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
        {/* Заголовок с настройками столбцов */}
        <div className="flex justify-end p-3 border-b border-gray-200">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
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
        <div className="overflow-x-auto">
          <table key={forceRender} ref={tableRef} className="w-full table-fixed">
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
                {visibleColumns.map((column, index) => {
                  const columnKey = String(column.key);
                  const defaultWidth = column.minWidth || 150;
                  const width = columnWidths[columnKey] || defaultWidth;
                  
                  return (
                    <th
                      key={columnKey}
                      data-column={columnKey}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative ${column.className || ''}`}
                      style={{ width: `${width}px` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
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
                        </div>
                        
                        {/* Разделитель для изменения размера */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-300 bg-transparent transition-colors"
                          onMouseDown={(e) => startResize(columnKey, e)}
                          style={{ 
                            backgroundColor: isResizing === columnKey ? '#3B82F6' : 'transparent'
                          }}
                        />
                      </div>
                    </th>
                  );
                })}
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
                  {visibleColumns.map((column) => {
                    const value = item[column.key];
                    const formattedValue = column.format ? column.format(value) : value;
                    const columnKey = String(column.key);
                    const defaultWidth = column.minWidth || 150;
                    const width = columnWidths[columnKey] || defaultWidth;
                    
                    return (
                      <td
                        key={columnKey}
                        className={`px-4 py-3 text-sm ${column.className || ''}`}
                        style={{ width: `${width}px` }}
                      >
                        <div className="overflow-hidden">
                          {column.copyable ? (
                            <CopyableCell
                              value={formattedValue ? String(formattedValue) : null}
                              type={column.label}
                              multiline={column.multiline}
                              copiedStates={copiedStates}
                              onCopy={copyToClipboard}
                            />
                          ) : (
                            <span className={column.multiline ? "break-words" : "truncate block"}>
                              {formattedValue ? String(formattedValue) : <span className="text-gray-400">-</span>}
                            </span>
                          )}
                        </div>
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