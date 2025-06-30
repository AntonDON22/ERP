import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Upload, Trash2, ArrowUpDown, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Product, InsertProduct } from "@shared/schema";
import * as XLSX from "xlsx";
import { apiRequest } from "@/lib/queryClient";

export default function ProductsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const CopyableCell = ({ value, type }: { value: string | null | undefined; type: string }) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    const key = `${type}-${value}`;
    const isCopied = copiedStates[key];
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="truncate">{value}</span>
        <button
          onClick={() => copyToClipboard(value, type)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const importMutation = useMutation({
    mutationFn: async (productsData: InsertProduct[]) => {
      return apiRequest("/api/products/import", {
        method: "POST",
        body: JSON.stringify({ products: productsData }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Товары импортированы",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать товары",
        variant: "destructive",
      });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const response = await fetch("/api/products/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении товаров");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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

  const formatPrice = (price: string | number | null | undefined): string => {
    if (!price || price === '') return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '-' : `${numPrice.toFixed(2)} ₽`;
  };

  const formatWeight = (weight: string | number | null | undefined): string => {
    if (!weight || weight === '') return '-';
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
    return isNaN(numWeight) ? '-' : `${numWeight} г`;
  };

  const formatDimensions = (
    length: string | number | null | undefined, 
    width: string | number | null | undefined, 
    height: string | number | null | undefined
  ): string => {
    const l = length && length !== '' ? (typeof length === 'string' ? parseFloat(length) : length) : null;
    const w = width && width !== '' ? (typeof width === 'string' ? parseFloat(width) : width) : null;
    const h = height && height !== '' ? (typeof height === 'string' ? parseFloat(height) : height) : null;
    
    if (!l && !w && !h) return '-';
    
    const parts = [];
    if (l && !isNaN(l)) parts.push(`${l}`);
    if (w && !isNaN(w)) parts.push(`${w}`);
    if (h && !isNaN(h)) parts.push(`${h}`);
    
    return parts.length > 0 ? `${parts.join('×')} мм` : '-';
  };

  const filteredProducts = products.filter((product: Product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query))
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
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

  const selectionState = {
    selectedCount: selectedProducts.size,
    isAllSelected: sortedProducts.length > 0 && selectedProducts.size === sortedProducts.length,
    isIndeterminate: selectedProducts.size > 0 && selectedProducts.size < sortedProducts.length
  };

  const handleExportToExcel = () => {
    const exportData = products.map((product: Product) => ({
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
      }));

      importMutation.mutate(productsToImport);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обработать файл",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Загрузка товаров...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Поиск по названию, артикулу или штрихкоду..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex gap-2">
            {selectedProducts.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Удалить ({selectedProducts.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              disabled={importMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-1" />
              Импорт
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              disabled={!products || products.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Экспорт
            </Button>
          </div>
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            Найдено товаров: {sortedProducts.length} из {products.length}
          </p>
        )}
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
        <div className="overflow-x-auto min-w-full">
          <table className="w-full" style={{ tableLayout: 'fixed', width: '1400px', minWidth: '1400px' }}>
            <thead className="bg-gray-50 h-12">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <Checkbox
                    checked={selectionState.isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={selectionState.isIndeterminate ? "indeterminate" : ""}
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '500px', minWidth: '500px', maxWidth: '500px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("name")}
                  >
                    <span>Название</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("sku")}
                  >
                    <span>Артикул</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("price")}
                  >
                    <span>Цена</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("purchasePrice")}
                  >
                    <span>Цена закупки</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("barcode")}
                  >
                    <span>Штрихкод</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("weight")}
                  >
                    <span>Вес (г)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("dimensions")}
                  >
                    <span>Размеры</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Загрузка...
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
                  <tr key={product.id} className="hover:bg-gray-50 h-20">
                    <td className="px-4 py-4 w-12">
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="leading-tight" style={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        hyphens: 'auto'
                      }}>
                        <CopyableCell value={product.name} type="Название" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        <CopyableCell value={product.sku} type="Артикул" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        {formatPrice(product.price)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        {formatPrice(product.purchasePrice)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        <CopyableCell value={product.barcode} type="Штрихкод" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        {formatWeight(product.weight)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate">
                        {formatDimensions(product.length, product.width, product.height)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Всего товаров: {products.length}
        {selectedProducts.size > 0 && ` • Выбрано: ${selectedProducts.size}`}
      </div>
    </div>
  );
}