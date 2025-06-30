import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import { Product, InsertProduct } from "@shared/schema";
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
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isResizing, setIsResizing] = useState(false);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('productTableColumnWidths');
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

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/suppliers"],
  });

  const importMutation = useMutation({
    mutationFn: async (products: InsertProduct[]) => {
      const response = await fetch("/api/suppliers/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suppliers: products }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при импорте поставщиков");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Поставщики импортированы",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать поставщиков",
        variant: "destructive",
      });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const response = await fetch("/api/suppliers/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ supplierIds: productIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении поставщиков");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Выбранные поставщики удалены",
      });
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить поставщиков",
        variant: "destructive",
      });
    },
  });

  // Мемоизированная фильтрация и сортировка товаров
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
      );
    });
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    return filteredProducts.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
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
  }, [filteredProducts, sortField, sortDirection]);

  // Мемоизированные вычисления состояния выбора
  const selectionState = useMemo(() => {
    const totalVisible = filteredProducts.length;
    const selectedCount = selectedProducts.size;
    const isAllSelected = totalVisible > 0 && selectedCount === totalVisible;
    const isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;
    
    return {
      totalVisible,
      selectedCount,
      isAllSelected,
      isIndeterminate
    };
  }, [filteredProducts.length, selectedProducts.size]);

  // Функции для работы с выбором товаров
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }, [filteredProducts]);

  const handleSelectProduct = useCallback((productId: number, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(productId);
      } else {
        newSelected.delete(productId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedProducts.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedProducts));
  }, [selectedProducts, deleteSelectedMutation]);

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportToExcel = () => {
    if (!products || products.length === 0) {
      return;
    }

    const exportData = products.map(product => ({
      'Название': product.name,
      'Артикул': product.sku,
      'Цена': product.price,
      'Цена закупки': product.purchasePrice,
      'Штрихкод': product.barcode || '',
      'Вес (г)': product.weight || '',
      'Длина (мм)': product.length || '',
      'Ширина (мм)': product.width || '',
      'Высота (мм)': product.height || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    
    const fileName = `товары_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
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

      const productsToImport: InsertProduct[] = jsonData.map((row: any) => ({
        name: row['Название'] || row['название'] || '',
        sku: row['Артикул'] || row['артикул'] || '',
        price: String(row['Цена'] || row['цена'] || '0'),
        purchasePrice: String(row['Цена закупки'] || row['цена закупки'] || '0'),
        barcode: row['Штрихкод'] || row['штрихкод'] || null,
        weight: String(row['Вес (г)'] || row['вес'] || '') || undefined,
        length: String(row['Длина (мм)'] || row['длина'] || '') || undefined,
        width: String(row['Ширина (мм)'] || row['ширина'] || '') || undefined,
        height: String(row['Высота (мм)'] || row['высота'] || '') || undefined,
      })).filter(product => product.name && product.sku);

      if (productsToImport.length === 0) {
        toast({
          title: "Ошибка",
          description: "Не найдено товаров для импорта. Проверьте формат файла.",
          variant: "destructive",
        });
        return;
      }

      importMutation.mutate(productsToImport);
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
    localStorage.setItem('productTableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Обработчики изменения размера колонок (поддержка мыши и touch)
  const handleResizeStart = useCallback((startX: number, column: keyof ColumnWidths) => {
    console.log('Resize started for column:', column);
    setIsResizing(true);
    
    const startWidth = columnWidths[column];
    
    // Добавляем класс для предотвращения выделения текста
    document.body.classList.add('table-resizing');
    document.body.style.cursor = 'col-resize';
    
    const handleMove = (currentX: number) => {
      const deltaX = currentX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Ошибка при загрузке товаров. Пожалуйста, попробуйте еще раз.
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
                placeholder="Поиск по названию, артикулу или штрихкоду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Найдено товаров: {sortedProducts.length} из {products.length}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {selectedProducts.size > 0 && (
              <Button 
                variant="destructive" 
                className="inline-flex items-center h-10"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить выбранные ({selectedProducts.size})
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
              disabled={!products || products.length === 0}
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

      {/* Products Table */}
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
                      <span>Наименование</span>
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
                      onClick={() => handleSort("sku")}
                    >
                      <span>Артикул</span>
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
                      onClick={() => handleSort("price")}
                    >
                      <span>Цена</span>
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
                      onClick={() => handleSort("purchasePrice")}
                    >
                      <span>Цена закупки</span>
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
                      onClick={() => handleSort("barcode")}
                    >
                      <span>Штрихкод</span>
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
                      onClick={() => handleSort("weight")}
                    >
                      <span>Вес (г)</span>
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: `${columnWidths.dimensions}px`, minWidth: `${columnWidths.dimensions}px`, maxWidth: `${columnWidths.dimensions}px` }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("length")}
                  >
                    <span>Габариты (мм)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Загрузка товаров...
                  </td>
                </tr>
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "Товары не найдены" : "Нет товаров для отображения"}
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 w-12">
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={product.name} type="Название" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={product.sku} type="Артикул" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatPrice(product.purchasePrice)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={product.barcode} type="Штрихкод" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatWeight(product.weight)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatDimensions(product.length, product.width, product.height)}
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
        Всего товаров: {products.length}
        {searchQuery && ` • Показано: ${sortedProducts.length}`}
        {selectedProducts.size > 0 && ` • Выбрано: ${selectedProducts.size}`}
      </div>
    </div>
  );
}