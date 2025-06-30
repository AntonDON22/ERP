import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import type { Product } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function ProductsList() {
  const [sortField, setSortField] = useState<keyof Product>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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
      'Вес (кг)': product.weight || '',
      'Длина (см)': product.length || '',
      'Ширина (см)': product.width || '',
      'Высота (см)': product.height || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    
    const fileName = `товары_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
          <div className="mt-4 sm:mt-0">
            <Button 
              variant="outline" 
              className="inline-flex items-center"
              onClick={handleExportToExcel}
              disabled={!products || products.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт в Excel
            </Button>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Название</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Артикул</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Цена</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("purchasePrice")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Цена закупки</span>
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Штрихкод
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Вес (кг)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Габариты (см)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(product.purchasePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.barcode || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatWeight(product.weight)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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