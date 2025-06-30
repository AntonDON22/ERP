import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Product, InsertProduct } from "@shared/schema";
import * as XLSX from 'xlsx';

interface ColumnWidths {
  name: number;
  sku: number;
  price: number;
  purchasePrice: number;
  barcode: number;
  weight: number;
  dimensions: number;
}

export default function ProductsList() {
  const [sortField, setSortField] = useState<keyof Product>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('productColumnWidths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
    }
    return {
      name: 250,
      sku: 150,
      price: 120,
      purchasePrice: 140,
      barcode: 150,
      weight: 100,
      dimensions: 180
    };
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [wasResizing, setWasResizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Функции для изменения размера столбцов
  const handleMouseDown = useCallback((columnName: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Предотвращаем всплытие события
    setIsResizing(columnName);
    setWasResizing(true);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnName]);
  }, [columnWidths]);

  // Добавляем глобальные обработчики событий мыши
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Минимальная ширина 50px
      
      setColumnWidths(prev => {
        const newWidths = {
          ...prev,
          [isResizing]: newWidth
        };
        // Сохраняем в localStorage
        localStorage.setItem('productColumnWidths', JSON.stringify(newWidths));
        return newWidths;
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      // Задержка для предотвращения срабатывания сортировки
      setTimeout(() => {
        setWasResizing(false);
      }, 100);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidth]);
  
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const importMutation = useMutation({
    mutationFn: async (products: InsertProduct[]) => {
      const results = [];
      for (const product of products) {
        try {
          const result = await apiRequest("POST", "/api/products", product);
          results.push(result);
        } catch (error) {
          console.error('Error importing product:', product, error);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Успешно",
        description: `Импортировано ${results.length} товаров`,
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось импортировать товары",
        variant: "destructive",
      });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      await Promise.all(productIds.map(id => 
        apiRequest('DELETE', `/api/products/${id}`)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts(new Set());
      toast({
        title: "Успешно",
        description: "Выбранные товары удалены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить товары",
        variant: "destructive",
      });
    },
  });

  // Функции для работы с выбором товаров
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(sortedProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedProducts));
  };

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

  // Фильтрация товаров по поисковому запросу
  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  const sortedProducts = filteredProducts
    .sort((a, b) => {
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
                {deleteSelectedMutation.isPending ? 'Удаление...' : `Удалить (${selectedProducts.size})`}
              </Button>
            )}
            <Button 
              variant="outline" 
              className="inline-flex items-center h-10"
              onClick={handleImportClick}
              disabled={importMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importMutation.isPending ? 'Загрузка...' : 'Импорт из Excel'}
            </Button>
            <Button 
              variant="outline" 
              className="inline-flex items-center h-10"
              onClick={handleExportToExcel}
              disabled={!products || products.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт в Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Загрузка товаров...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {searchQuery ? 'Товары не найдены по запросу' : 'Нет товаров'}
            </p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-1">
                Попробуйте изменить поисковый запрос или очистить фильтр
              </p>
            )}
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto ${isResizing ? 'resizing' : ''}`} style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
              <table 
                className="divide-y divide-gray-200" 
                style={{ 
                  tableLayout: 'fixed',
                  width: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0)}px`,
                  minWidth: '100%'
                }}
              >
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">
                      <Checkbox
                        checked={selectedProducts.size === sortedProducts.length && sortedProducts.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Выбрать все товары"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                      onClick={(e) => {
                        if (!isResizing && !wasResizing) {
                          handleSort("name");
                        }
                      }}
                      style={{ 
                        width: `${columnWidths.name}px`,
                        minWidth: `${columnWidths.name}px`,
                        maxWidth: `${columnWidths.name}px`
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Название</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div 
                        className={`column-resizer ${isResizing === 'name' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('name', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                      onClick={(e) => {
                        if (!isResizing && !wasResizing) {
                          handleSort("sku");
                        }
                      }}
                      style={{ 
                        width: `${columnWidths.sku}px`,
                        minWidth: `${columnWidths.sku}px`,
                        maxWidth: `${columnWidths.sku}px`
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Артикул</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div 
                        className={`column-resizer ${isResizing === 'sku' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('sku', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                      onClick={(e) => {
                        if (!isResizing && !wasResizing) {
                          handleSort("price");
                        }
                      }}
                      style={{ 
                        width: `${columnWidths.price}px`,
                        minWidth: `${columnWidths.price}px`,
                        maxWidth: `${columnWidths.price}px`
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Цена</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div 
                        className={`column-resizer ${isResizing === 'price' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('price', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                      onClick={(e) => {
                        if (!isResizing && !wasResizing) {
                          handleSort("purchasePrice");
                        }
                      }}
                      style={{ 
                        width: `${columnWidths.purchasePrice}px`,
                        minWidth: `${columnWidths.purchasePrice}px`,
                        maxWidth: `${columnWidths.purchasePrice}px`
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Цена закупки</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div 
                        className={`column-resizer ${isResizing === 'purchasePrice' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('purchasePrice', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ 
                        width: `${columnWidths.barcode}px`,
                        minWidth: `${columnWidths.barcode}px`,
                        maxWidth: `${columnWidths.barcode}px`
                      }}
                    >
                      Штрихкод
                      <div 
                        className={`column-resizer ${isResizing === 'barcode' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('barcode', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ 
                        width: `${columnWidths.weight}px`,
                        minWidth: `${columnWidths.weight}px`,
                        maxWidth: `${columnWidths.weight}px`
                      }}
                    >
                      Вес (г)
                      <div 
                        className={`column-resizer ${isResizing === 'weight' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('weight', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ 
                        width: `${columnWidths.dimensions}px`,
                        minWidth: `${columnWidths.dimensions}px`,
                        maxWidth: `${columnWidths.dimensions}px`
                      }}
                    >
                      Габариты (мм)
                      <div 
                        className={`column-resizer ${isResizing === 'dimensions' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('dimensions', e)}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap w-12">
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked === true)}
                          aria-label={`Выбрать товар ${product.name}`}
                        />
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap"
                        style={{ 
                          width: `${columnWidths.name}px`,
                          minWidth: `${columnWidths.name}px`,
                          maxWidth: `${columnWidths.name}px`
                        }}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ 
                          width: `${columnWidths.sku}px`,
                          minWidth: `${columnWidths.sku}px`,
                          maxWidth: `${columnWidths.sku}px`
                        }}
                      >
                        {product.sku}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ 
                          width: `${columnWidths.price}px`,
                          minWidth: `${columnWidths.price}px`,
                          maxWidth: `${columnWidths.price}px`
                        }}
                      >
                        {formatPrice(product.price)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ 
                          width: `${columnWidths.purchasePrice}px`,
                          minWidth: `${columnWidths.purchasePrice}px`,
                          maxWidth: `${columnWidths.purchasePrice}px`
                        }}
                      >
                        {formatPrice(product.purchasePrice)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ 
                          width: `${columnWidths.barcode}px`,
                          minWidth: `${columnWidths.barcode}px`,
                          maxWidth: `${columnWidths.barcode}px`
                        }}
                      >
                        {product.barcode || "—"}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ 
                          width: `${columnWidths.weight}px`,
                          minWidth: `${columnWidths.weight}px`,
                          maxWidth: `${columnWidths.weight}px`
                        }}
                      >
                        {formatWeight(product.weight)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ 
                          width: `${columnWidths.dimensions}px`,
                          minWidth: `${columnWidths.dimensions}px`,
                          maxWidth: `${columnWidths.dimensions}px`
                        }}
                      >
                        {formatDimensions(product.length, product.width, product.height)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary */}
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Всего товаров: <span className="font-medium">{sortedProducts.length}</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}