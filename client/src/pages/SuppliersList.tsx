import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Upload, Download, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";
import * as XLSX from 'xlsx';

interface ColumnWidths {
  name: number;
  website: number;
}

export default function SuppliersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('supplierColumnWidths');
    return saved ? JSON.parse(saved) : {
      name: 300,
      website: 250,
    };
  });
  const [isResizing, setIsResizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Сохранение ширины колонок в localStorage
  useEffect(() => {
    localStorage.setItem('supplierColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest('/api/suppliers/delete-multiple', {
        method: 'POST',
        body: JSON.stringify({ supplierIds }),
        headers: { 'Content-Type': 'application/json' },
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

  const importMutation = useMutation({
    mutationFn: async (suppliers: InsertSupplier[]) => {
      return apiRequest('/api/suppliers/import', {
        method: 'POST',
        body: JSON.stringify({ suppliers }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Успешно",
        description: `Импортировано поставщиков: ${data.imported}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать поставщиков",
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
    return [...filteredSuppliers].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSuppliers]);

  const handleSelectSupplier = (supplierId: number, checked: boolean) => {
    setSelectedSuppliers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(supplierId);
      } else {
        newSet.delete(supplierId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(filteredSuppliers.map((s: Supplier) => s.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSuppliers.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedSuppliers));
  };

  const handleExportToExcel = () => {
    if (!suppliers || suppliers.length === 0) {
      return;
    }

    const exportData = suppliers.map((supplier: Supplier) => ({
      'Название': supplier.name,
      'Веб-сайт': supplier.website || '',
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
        description: "Не удалось прочитать файл. Проверьте формат.",
        variant: "destructive",
      });
    }

    // Сброс значения input для возможности повторного выбора того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Изменение размера колонок
  const handleResizeStart = useCallback((startX: number, column: keyof ColumnWidths) => {
    console.log('Resize started for column:', column);
    setIsResizing(true);
    document.body.classList.add('table-resizing');
    
    const handleMove = (currentX: number) => {
      const diff = currentX - startX;
      const currentWidth = columnWidths[column];
      const newWidth = Math.max(50, currentWidth + diff);
      
      console.log(`Resizing ${column} to width: ${newWidth}`);
      
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

  // Компонент для ячейки с возможностью копирования
  const CopyableCell = ({ value, type }: { value: string | null; type: string }) => {
    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
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
    };

    return (
      <div className="flex items-center justify-between group">
        <span className="truncate">{value || '-'}</span>
        {value && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-gray-100 rounded"
            title={`Копировать ${type.toLowerCase()}`}
          >
            <Copy className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>
    );
  };

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

      {/* Table */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 w-12">
                  <Checkbox
                    checked={selectedSuppliers.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group">
                  <div 
                    className="flex items-center justify-between select-none"
                    style={{ width: `${columnWidths.name}px` }}
                  >
                    <span>Название</span>
                    <div 
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-300 group-hover:bg-blue-200 ${isResizing ? 'bg-blue-400' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'name')}
                      onTouchStart={(e) => handleTouchStart(e, 'name')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group">
                  <div 
                    className="flex items-center justify-between select-none"
                    style={{ width: `${columnWidths.website}px` }}
                  >
                    <span>Веб-сайт</span>
                    <div 
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-300 group-hover:bg-blue-200 ${isResizing ? 'bg-blue-400' : ''}`}
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
                    <td 
                      className="px-4 py-4 text-sm text-gray-900"
                      style={{ width: `${columnWidths.name}px` }}
                    >
                      <CopyableCell value={supplier.name} type="Название" />
                    </td>
                    <td 
                      className="px-4 py-4 text-sm text-gray-900"
                      style={{ width: `${columnWidths.website}px` }}
                    >
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
      <div className="mt-4 text-sm text-gray-600">
        Всего поставщиков: {suppliers.length}
        {searchQuery && ` (отображено: ${sortedSuppliers.length})`}
        {selectedSuppliers.size > 0 && ` | Выбрано: ${selectedSuppliers.size}`}
      </div>
    </div>
  );
}