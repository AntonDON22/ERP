import { useState, useRef, useCallback, useEffect, useMemo, ReactNode } from "react";
import { ArrowUpDown, Download, Upload, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

// Универсальная конфигурация колонки
export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  copyable?: boolean;
  width: number; // Фиксированная ширина колонки
  render?: (value: any, row: T) => ReactNode;
}

// Конфигурация действий
export interface DataTableActions<T = any> {
  onImport?: (data: T[]) => Promise<void>;
  onExport?: () => void;
  onDeleteSelected?: (ids: number[]) => Promise<void>;
  importFields?: { [key: string]: string[] }; // Маппинг полей для импорта
  exportFileName?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[]; // Поля для поиска
}

// Основные пропсы компонента
export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableActions<T>;
  isLoading?: boolean;
  storageKey: string; // Ключ для сохранения настроек в localStorage
  entityName: string; // Название сущности (товары, поставщики)
  entityNamePlural: string; // Название во множественном числе
}

export default function DataTable<T extends { id: number }>({
  data = [],
  columns,
  actions,
  isLoading = false,
  storageKey,
  entityName,
  entityNamePlural,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>(columns[0]?.key || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isResizing, setIsResizing] = useState(false);
  
  // Состояние ширины колонок с сохранением в localStorage
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`${storageKey}ColumnWidths`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Создаем начальные ширины из конфигурации колонок
    const initialWidths: Record<string, number> = {};
    columns.forEach(col => {
      initialWidths[col.key] = col.width;
    });
    return initialWidths;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Функция копирования в буфер обмена
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Скопировано",
        description: `${type} скопирован в буфер обмена`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Компонент для ячейки с возможностью копирования
  const CopyableCell = ({ value, type, column }: { value: any; type: string; column: DataTableColumn<T> }) => {
    if (!value && value !== 0) return <span>-</span>;
    
    const displayValue = column.render ? column.render(value, {} as T) : String(value);
    
    if (!column.copyable) {
      return <span className="truncate">{displayValue}</span>;
    }
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="truncate">{displayValue}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(String(value), type);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          title={`Копировать ${type.toLowerCase()}`}
        >
          <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
        </button>
      </div>
    );
  };

  // Мемоизированная фильтрация данных
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !actions?.searchFields) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      return actions.searchFields!.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, actions?.searchFields]);

  // Мемоизированная сортировка данных
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Мемоизированные вычисления состояния выбора
  const selectionState = useMemo(() => {
    const totalVisible = filteredData.length;
    const selectedCount = selectedItems.size;
    const isAllSelected = totalVisible > 0 && selectedCount === totalVisible;
    const isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;
    
    return {
      totalVisible,
      selectedCount,
      isAllSelected,
      isIndeterminate
    };
  }, [filteredData.length, selectedItems.size]);

  // Функции для работы с выбором
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredData]);

  const handleSelectItem = useCallback((itemId: number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.size === 0 || !actions?.onDeleteSelected) return;
    
    try {
      await actions.onDeleteSelected(Array.from(selectedItems));
      setSelectedItems(new Set());
    } catch (error) {
      // Ошибка обрабатывается в родительском компоненте
    }
  }, [selectedItems, actions]);

  // Сортировка
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Экспорт в Excel
  const handleExportToExcel = () => {
    if (actions?.onExport) {
      actions.onExport();
      return;
    }
    
    if (!data || data.length === 0) return;

    const exportData = data.map(item => {
      const exportItem: any = {};
      columns.forEach(col => {
        exportItem[col.label] = (item as any)[col.key] || '';
      });
      return exportItem;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityNamePlural);
    
    const fileName = actions?.exportFileName || `${entityNamePlural.toLowerCase()}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Импорт из Excel
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !actions?.onImport) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!actions.importFields) {
        toast({
          title: "Ошибка",
          description: "Конфигурация импорта не настроена",
          variant: "destructive",
        });
        return;
      }

      const itemsToImport = jsonData.map((row: any) => {
        const item: any = {};
        Object.entries(actions.importFields!).forEach(([key, possibleNames]) => {
          const foundValue = possibleNames.find(name => row[name] !== undefined);
          if (foundValue !== undefined) {
            item[key] = row[foundValue];
          }
        });
        return item;
      }).filter(item => {
        // Фильтруем элементы, у которых есть обязательные поля
        return Object.keys(item).length > 0;
      });

      if (itemsToImport.length === 0) {
        toast({
          title: "Ошибка",
          description: `Не найдено ${entityNamePlural.toLowerCase()} для импорта. Проверьте формат файла.`,
          variant: "destructive",
        });
        return;
      }

      await actions.onImport(itemsToImport);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось прочитать файл",
        variant: "destructive",
      });
    }

    event.target.value = '';
  };

  // Сохраняем ширину колонок в localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}ColumnWidths`, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  // Обработчики изменения размера колонок
  const handleResizeStart = useCallback((startX: number, columnKey: string) => {
    setIsResizing(true);
    
    const startWidth = columnWidths[columnKey];
    
    document.body.classList.add('table-resizing');
    document.body.style.cursor = 'col-resize';
    
    const handleMove = (currentX: number) => {
      const deltaX = currentX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };
    
    const handleEnd = () => {
      setIsResizing(false);
      document.body.classList.remove('table-resizing');
      document.body.style.cursor = '';
    };

    return { handleMove, handleEnd };
  }, [columnWidths]);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { handleMove, handleEnd } = handleResizeStart(e.clientX, columnKey);
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };
    
    const handleMouseUp = () => {
      handleEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleResizeStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const { handleMove, handleEnd } = handleResizeStart(touch.clientX, columnKey);
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
    };
    
    const handleTouchEnd = () => {
      handleEnd();
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [handleResizeStart]);

  const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 48);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={actions?.searchPlaceholder || `Поиск ${entityNamePlural.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Найдено {entityNamePlural.toLowerCase()}: {sortedData.length} из {data.length}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {selectedItems.size > 0 && actions?.onDeleteSelected && (
              <Button 
                variant="destructive" 
                className="inline-flex items-center h-10"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить выбранные ({selectedItems.size})
              </Button>
            )}
            {actions?.onImport && (
              <Button
                variant="outline"
                className="inline-flex items-center h-10"
                onClick={handleImportClick}
              >
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </Button>
            )}
            <Button
              variant="outline"
              className="inline-flex items-center h-10"
              onClick={handleExportToExcel}
              disabled={!data || data.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      {actions?.onImport && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed', minWidth: totalWidth + 'px' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-6 py-3 text-left">
                  <Checkbox
                    checked={selectionState.isAllSelected}
                    onCheckedChange={handleSelectAll}
                    {...(selectionState.isIndeterminate && { "data-state": "indeterminate" })}
                  />
                </th>
                
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider transition-colors duration-150 relative group ${
                      column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    style={{ width: `${columnWidths[column.key] || column.width}px` }}
                    onClick={column.sortable !== false ? () => handleSort(column.key) : undefined}
                  >
                    <div className="flex items-center justify-between select-none">
                      <div className="flex items-center">
                        <span>{column.label}</span>
                        {column.sortable !== false && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-300 group-hover:bg-blue-200 ${isResizing ? 'bg-blue-400' : ''}`}
                        onMouseDown={(e) => handleMouseDown(e, column.key)}
                        onTouchStart={(e) => handleTouchStart(e, column.key)}
                        title="Потяните для изменения ширины столбца"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-4 text-center text-gray-500">
                    Загрузка {entityNamePlural.toLowerCase()}...
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? `${entityNamePlural} не найдены` : `Нет ${entityNamePlural.toLowerCase()} для отображения`}
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 w-12">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </td>
                    {columns.map((column) => (
                      <td 
                        key={column.key}
                        className="px-6 py-4 text-sm text-gray-900"
                        style={{ width: `${columnWidths[column.key] || column.width}px` }}
                      >
                        <CopyableCell 
                          value={(item as any)[column.key]} 
                          type={column.label} 
                          column={column}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Всего {entityNamePlural.toLowerCase()}: {data.length}
        {searchQuery && ` (отображено: ${sortedData.length})`}
        {selectedItems.size > 0 && ` | Выбрано: ${selectedItems.size}`}
      </div>
    </div>
  );
}