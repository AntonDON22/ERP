import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    name: 250,
    sku: 150,
    price: 120,
    purchasePrice: 140,
    barcode: 150,
    weight: 100,
    dimensions: 180
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Функции для изменения размера столбцов
  const handleMouseDown = useCallback((columnName: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Предотвращаем всплытие события
    setIsResizing(columnName);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnName]);
  }, [columnWidths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Минимальная ширина 50px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  }, [isResizing, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  // Добавляем глобальные обработчики событий мыши
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
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

  const sortedProducts = products
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Товары</h2>
            <p className="mt-1 text-sm text-gray-500">Просмотр каталога товаров</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button 
              variant="outline" 
              className="inline-flex items-center"
              onClick={handleImportClick}
              disabled={importMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importMutation.isPending ? 'Загрузка...' : 'Импорт из Excel'}
            </Button>
            <Button 
              variant="outline" 
              className="inline-flex items-center"
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
            <p className="text-gray-500">Нет товаров</p>
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto ${isResizing ? 'resizing' : ''}`} style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
              <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                      onClick={() => handleSort("name")}
                      style={{ width: `${columnWidths.name}px` }}
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
                      onClick={() => handleSort("sku")}
                      style={{ width: `${columnWidths.sku}px` }}
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
                      onClick={() => handleSort("price")}
                      style={{ width: `${columnWidths.price}px` }}
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
                      onClick={() => handleSort("purchasePrice")}
                      style={{ width: `${columnWidths.purchasePrice}px` }}
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
                      style={{ width: `${columnWidths.barcode}px` }}
                    >
                      Штрихкод
                      <div 
                        className={`column-resizer ${isResizing === 'barcode' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('barcode', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ width: `${columnWidths.weight}px` }}
                    >
                      Вес (г)
                      <div 
                        className={`column-resizer ${isResizing === 'weight' ? 'active' : ''}`}
                        onMouseDown={(e) => handleMouseDown('weight', e)}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ width: `${columnWidths.dimensions}px` }}
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
                      <td 
                        className="px-6 py-4 whitespace-nowrap"
                        style={{ width: `${columnWidths.name}px` }}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ width: `${columnWidths.sku}px` }}
                      >
                        {product.sku}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ width: `${columnWidths.price}px` }}
                      >
                        {formatPrice(product.price)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        style={{ width: `${columnWidths.purchasePrice}px` }}
                      >
                        {formatPrice(product.purchasePrice)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ width: `${columnWidths.barcode}px` }}
                      >
                        {product.barcode || "—"}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ width: `${columnWidths.weight}px` }}
                      >
                        {formatWeight(product.weight)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        style={{ width: `${columnWidths.dimensions}px` }}
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