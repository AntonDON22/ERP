import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function SuppliersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Supplier>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [isResizing, setIsResizing] = useState(false);

  // Ширина столбцов (сохраняется в localStorage)
  interface ColumnWidths {
    name: number;
    website: number;
  }

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('supplierTableColumnWidths');
    return saved ? JSON.parse(saved) : {
      name: 300,
      website: 250,
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const CopyableCell = ({ value, type }: { value: string | null | undefined; type: string }) => {
    if (!value) return <span>-</span>;
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="truncate">{value}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(value, type);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          title={`Копировать ${type.toLowerCase()}`}
        >
          <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
        </button>
      </div>
    );
  };

  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Обработка ошибок отдельно
  if (error) {
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить поставщиков",
      variant: "destructive",
    });
  }

  // Мутация для удаления выбранных поставщиков
  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await apiRequest("POST", "/api/suppliers/delete-multiple", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedSuppliers(new Set());
      toast({
        title: "Успешно",
        description: "Выбранные поставщики удалены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить поставщиков",
        variant: "destructive",
      });
    },
  });

  // Мутация для импорта поставщиков
  const importMutation = useMutation({
    mutationFn: async (suppliers: InsertSupplier[]) => {
      const response = await apiRequest("POST", "/api/suppliers/import", { suppliers });
      return await response.json();
    },
    onSuccess: (data: Supplier[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Успешно",
        description: `Импортировано поставщиков: ${data.length}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось импортировать поставщиков",
        variant: "destructive",
      });
    },
  });

  // Фильтрация поставщиков
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    
    const query = searchQuery.toLowerCase();
    return suppliers.filter((supplier: Supplier) =>
      supplier.name.toLowerCase().includes(query) ||
      (supplier.website && supplier.website.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  // Сортировка поставщиков
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue), 'ru', { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredSuppliers, sortField, sortDirection]);

  // Состояние выбора
  const selectionState = useMemo(() => {
    const totalVisible = filteredSuppliers.length;
    const selectedCount = selectedSuppliers.size;
    const isAllSelected = totalVisible > 0 && selectedCount === totalVisible;
    const isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;

    return {
      totalVisible,
      selectedCount,
      isAllSelected,
      isIndeterminate
    };
  }, [filteredSuppliers.length, selectedSuppliers.size]);

  // Функции для работы с выбором поставщиков
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(filteredSuppliers.map((s: Supplier) => s.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  }, [filteredSuppliers]);

  const handleSelectSupplier = useCallback((supplierId: number, checked: boolean) => {
    setSelectedSuppliers(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(supplierId);
      } else {
        newSelected.delete(supplierId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedSuppliers.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedSuppliers));
  }, [selectedSuppliers, deleteSelectedMutation]);

  const handleSort = (field: keyof Supplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportToExcel = () => {
    if (!suppliers || suppliers.length === 0) {
      return;
    }

    const exportData = suppliers.map((supplier: Supplier) => ({
      'Название': supplier.name,
      'Веб-сайт': supplier.website || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Поставщики");
    XLSX.writeFile(wb, "suppliers.xlsx");

    toast({
      title: "Успешно",
      description: "Данные экспортированы в файл suppliers.xlsx",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const suppliersToImport: InsertSupplier[] = jsonData.map((row: any) => ({
        name: row['Название'] || row['название'] || '',
        website: row['Веб-сайт'] || row['веб-сайт'] || row['website'] || undefined,
      })).filter(supplier => supplier.name);

      if (suppliersToImport.length === 0) {
        toast({
          title: "Ошибка",
          description: "Не найдено поставщиков для импорта. Проверьте формат файла.",
          variant: "destructive",
        });
        return;
      }

      importMutation.mutate(suppliersToImport);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось прочитать файл",
        variant: "destructive",
      });
    }

    // Очищаем input для возможности загрузки того же файла снова
    event.target.value = '';
  };

  // Сохраняем ширину колонок в localStorage
  useEffect(() => {
    localStorage.setItem('supplierTableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Обработчики изменения размера колонок (поддержка мыши и touch)
  const handleResizeStart = useCallback((startX: number, column: keyof ColumnWidths) => {
    setIsResizing(true);
    
    const startWidth = columnWidths[column];
    
    // Добавляем класс для предотвращения выделения текста
    document.body.classList.add('table-resizing');
    document.body.style.cursor = 'col-resize';
    
    const handleMove = (currentX: number) => {
      const deltaX = currentX - startX;
      const newWidth = Math.max(150, startWidth + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth
      }));
    };
    
    const handleEnd = () => {
      setIsResizing(false);
      document.body.classList.remove('table-resizing');
      document.body.style.cursor = '';
    };

    return { handleMove, handleEnd };
  }, [columnWidths]);

  const handleMouseDown = useCallback((e: React.MouseEvent, column: keyof ColumnWidths) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { handleMove, handleEnd } = handleResizeStart(e.clientX, column);
    
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

  const handleTouchStart = useCallback((e: React.TouchEvent, column: keyof ColumnWidths) => {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const { handleMove, handleEnd } = handleResizeStart(touch.clientX, column);
    
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Поиск по названию или веб-сайту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Найдено поставщиков: {sortedSuppliers.length} из {suppliers.length}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {selectedSuppliers.size > 0 && (
              <Button 
                variant="destructive" 
                className="inline-flex items-center h-10"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить выбранные ({selectedSuppliers.size})
              </Button>
            )}
            <Button
              variant="outline"
              className="inline-flex items-center h-10"
              onClick={handleImportClick}
              disabled={importMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              Импорт
            </Button>
            <Button
              variant="outline"
              className="inline-flex items-center h-10"
              onClick={handleExportToExcel}
              disabled={!suppliers || suppliers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed', minWidth: Object.values(columnWidths).reduce((sum, width) => sum + width, 48) + 'px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <Checkbox
                    checked={selectionState.isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={selectionState.isIndeterminate ? "indeterminate" : ""}
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>Название</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'name')}
                      onTouchStart={(e) => handleTouchStart(e, 'name')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.website}px`, minWidth: `${columnWidths.website}px`, maxWidth: `${columnWidths.website}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("website")}
                    >
                      <span>Веб-сайт</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'website')}
                      onTouchStart={(e) => handleTouchStart(e, 'website')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Загрузка поставщиков...
                  </td>
                </tr>
              ) : sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "Поставщики не найдены" : "Нет поставщиков для отображения"}
                  </td>
                </tr>
              ) : (
                sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 w-12">
                      <Checkbox
                        checked={selectedSuppliers.has(supplier.id)}
                        onCheckedChange={(checked) => handleSelectSupplier(supplier.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.name} type="Название" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.website} type="Веб-сайт" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Показано {sortedSuppliers.length} из {suppliers.length} поставщиков
          {selectionState.selectedCount > 0 && (
            <span className="ml-2">
              • Выбрано: {selectionState.selectedCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}