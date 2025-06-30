import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import { Supplier, InsertSupplier } from "@shared/schema";
import * as XLSX from "xlsx";
import { apiRequest } from "@/lib/queryClient";

interface ColumnWidths {
  name: number;
  sku: number;
  price: number;
  purchasePrice: number;
  barcode: number;
  weight: number;
  dimensions: number;
}

export default function SuppliersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Supplier>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [isResizing, setIsResizing] = useState(false);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('supplierTableColumnWidths');
    return saved ? JSON.parse(saved) : {
      name: 200,
      sku: 120,
      price: 100,
      purchasePrice: 120,
      barcode: 140,
      weight: 100,
      dimensions: 140
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
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Компонент для ячейки с возможностью копирования
  const CopyableCell = useCallback(({ value, type }: { value: string | null, type: string }) => {
    if (!value) return <span className="text-gray-400">—</span>;
    
    return (
      <div className="flex items-center justify-between group">
        <span className="truncate">{value}</span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 ml-2 flex-shrink-0"
          onClick={() => copyToClipboard(value, type)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    );
  }, [copyToClipboard]);

  // Получение поставщиков
  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
    staleTime: 30000,
  });

  // Мутация для удаления поставщика
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Успешно",
        description: "Поставщик удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить поставщика",
        variant: "destructive",
      });
    },
  });

  // Мутация для массового удаления поставщиков
  const deleteSelectedMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest('/api/suppliers/delete-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ supplierIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setSelectedSuppliers(new Set());
      toast({
        title: "Успешно",
        description: "Выбранные поставщики удалены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить поставщиков",
        variant: "destructive",
      });
    },
  });

  // Мутация для импорта поставщиков
  const importMutation = useMutation({
    mutationFn: async (suppliersData: InsertSupplier[]) => {
      return apiRequest('/api/suppliers/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suppliers: suppliersData }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Успешно",
        description: `Импортировано поставщиков: ${data.imported}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Ошибка при импорте поставщиков",
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
    const sorted = [...filteredSuppliers].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue), 'ru', { 
        numeric: true, 
        sensitivity: 'base' 
      });
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredSuppliers, sortField, sortDirection]);

  // Состояние выбора всех элементов
  const selectionState = useMemo(() => {
    const totalVisible = sortedSuppliers.length;
    const selectedVisible = sortedSuppliers.filter(supplier => selectedSuppliers.has(supplier.id)).length;
    
    return {
      isAllSelected: totalVisible > 0 && selectedVisible === totalVisible,
      isIndeterminate: selectedVisible > 0 && selectedVisible < totalVisible
    };
  }, [sortedSuppliers, selectedSuppliers]);

  // Обработчики
  const handleSort = (field: keyof Supplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectSupplier = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedSuppliers);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedSuppliers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(sortedSuppliers.map((s: Supplier) => s.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSuppliers.size === 0) return;
    deleteSelectedMutation.mutate([...selectedSuppliers]);
  };

  // Экспорт в Excel
  const handleExportToExcel = () => {
    if (!suppliers || suppliers.length === 0) {
      return;
    }

    const exportData = suppliers.map((supplier: Supplier) => ({
      'Название': supplier.name,
      'Веб-сайт': supplier.website || '',
      '-': '',
      '- ': '',
      '- -': '',
      '- - ': '',
      '- - -': '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Поставщики');
    
    const fileName = `поставщики_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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

    // Сброс значения input для возможности повторного выбора того же файла
    event.target.value = '';
  };

  // Сохранение ширины столбцов в localStorage
  useEffect(() => {
    localStorage.setItem('supplierTableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Обработка изменения размера столбцов
  const handleResizeStart = useCallback((startX: number, column: keyof ColumnWidths) => {
    setIsResizing(true);
    document.body.classList.add('table-resizing');
    document.body.style.cursor = 'col-resize';
    
    const startWidth = columnWidths[column];
    
    const handleMove = (currentX: number) => {
      const diff = currentX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      
      setColumnWidths(prev => {
        const newWidths = {
          ...prev,
          [column]: newWidth
        };
        console.log('New column widths:', newWidths);
        return newWidths;
      });
    };
    
    const handleEnd = () => {
      console.log('Resize ended for column:', column);
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
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1400px' }}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Ошибка при загрузке поставщиков. Пожалуйста, попробуйте еще раз.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1400px' }}>
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
          <table className="w-full" style={{ tableLayout: 'fixed', width: '1200px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
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
                  style={{ width: `${columnWidths.sku}px`, minWidth: `${columnWidths.sku}px`, maxWidth: `${columnWidths.sku}px` }}
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
                      onMouseDown={(e) => handleMouseDown(e, 'sku')}
                      onTouchStart={(e) => handleTouchStart(e, 'sku')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.price}px`, minWidth: `${columnWidths.price}px`, maxWidth: `${columnWidths.price}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>-</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'price')}
                      onTouchStart={(e) => handleTouchStart(e, 'price')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.purchasePrice}px`, minWidth: `${columnWidths.purchasePrice}px`, maxWidth: `${columnWidths.purchasePrice}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>-</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'purchasePrice')}
                      onTouchStart={(e) => handleTouchStart(e, 'purchasePrice')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.barcode}px`, minWidth: `${columnWidths.barcode}px`, maxWidth: `${columnWidths.barcode}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>-</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'barcode')}
                      onTouchStart={(e) => handleTouchStart(e, 'barcode')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.weight}px`, minWidth: `${columnWidths.weight}px`, maxWidth: `${columnWidths.weight}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>-</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'weight')}
                      onTouchStart={(e) => handleTouchStart(e, 'weight')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.dimensions}px`, minWidth: `${columnWidths.dimensions}px`, maxWidth: `${columnWidths.dimensions}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <span>-</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'dimensions')}
                      onTouchStart={(e) => handleTouchStart(e, 'dimensions')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Загрузка поставщиков...
                  </td>
                </tr>
              ) : sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "Поставщики не найдены" : "Нет поставщиков для отображения"}
                  </td>
                </tr>
              ) : (
                sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                      <Checkbox
                        checked={selectedSuppliers.has(supplier.id)}
                        onCheckedChange={(checked) => handleSelectSupplier(supplier.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px` }}>
                      <CopyableCell value={supplier.name} type="Название" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.sku}px`, minWidth: `${columnWidths.sku}px`, maxWidth: `${columnWidths.sku}px` }}>
                      <CopyableCell value={supplier.website} type="Веб-сайт" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.price}px`, minWidth: `${columnWidths.price}px`, maxWidth: `${columnWidths.price}px` }}>
                      -
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.purchasePrice}px`, minWidth: `${columnWidths.purchasePrice}px`, maxWidth: `${columnWidths.purchasePrice}px` }}>
                      -
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.barcode}px`, minWidth: `${columnWidths.barcode}px`, maxWidth: `${columnWidths.barcode}px` }}>
                      -
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.weight}px`, minWidth: `${columnWidths.weight}px`, maxWidth: `${columnWidths.weight}px` }}>
                      -
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.dimensions}px`, minWidth: `${columnWidths.dimensions}px`, maxWidth: `${columnWidths.dimensions}px` }}>
                      -
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 text-sm text-gray-500">
        Всего поставщиков: {suppliers.length}
        {selectedSuppliers.size > 0 && (
          <span className="ml-4">
            Выбрано: {selectedSuppliers.size}
          </span>
        )}
      </div>
    </div>
  );
}