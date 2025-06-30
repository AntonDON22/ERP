import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Upload, Trash2, ArrowUpDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

import { type Supplier, type InsertSupplier } from "@shared/schema";

export default function SuppliersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Supplier>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      const response = await fetch("/api/suppliers/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ supplierIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении поставщиков");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSelectedSuppliers(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
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

  const handleSort = (field: keyof Supplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(sortedSuppliers.map(s => s.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  };

  const handleSelectSupplier = (supplierId: number, checked: boolean) => {
    const newSelected = new Set(selectedSuppliers);
    if (checked) {
      newSelected.add(supplierId);
    } else {
      newSelected.delete(supplierId);
    }
    setSelectedSuppliers(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedSuppliers.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedSuppliers));
  };

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      (supplier.website && supplier.website.toLowerCase().includes(query))
    );
  });

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
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
    selectedCount: selectedSuppliers.size,
    isAllSelected: sortedSuppliers.length > 0 && selectedSuppliers.size === sortedSuppliers.length,
    isIndeterminate: selectedSuppliers.size > 0 && selectedSuppliers.size < sortedSuppliers.length
  };

  const handleExportToExcel = () => {
    const exportData = suppliers.map((supplier: Supplier) => ({
      'Название': supplier.name,
      'Вебсайт': supplier.website || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Поставщики");

    const fileName = `поставщики_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Экспорт завершен",
      description: `Файл ${fileName} сохранен`,
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
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      toast({
        title: "Импорт недоступен",
        description: "Функция импорта будет реализована позже",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось прочитать файл",
        variant: "destructive",
      });
    }

    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Загрузка поставщиков...</div>
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
              placeholder="Поиск по названию или вебсайту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex gap-2">
            {selectedSuppliers.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Удалить ({selectedSuppliers.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
            >
              <Upload className="w-4 h-4 mr-1" />
              Импорт
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              disabled={!suppliers || suppliers.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Экспорт
            </Button>
          </div>
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            Найдено поставщиков: {sortedSuppliers.length} из {suppliers.length}
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

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full" style={{ tableLayout: 'fixed', width: '1000px', minWidth: '1000px' }}>
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
                  style={{ width: '488px', minWidth: '488px', maxWidth: '488px' }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("website")}
                  >
                    <span>Вебсайт</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Загрузка...
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
                  <tr key={supplier.id} className="hover:bg-gray-50 h-16">
                    <td className="px-4 py-4 w-12">
                      <Checkbox
                        checked={selectedSuppliers.has(supplier.id)}
                        onCheckedChange={(checked) => handleSelectSupplier(supplier.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      <div className="truncate" title={supplier.name}>
                        {supplier.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      {supplier.website ? (
                        <div className="flex items-center gap-2 truncate">
                          <a
                            href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={supplier.website}
                          >
                            {supplier.website}
                          </a>
                          <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
        Всего поставщиков: {suppliers.length}
        {selectedSuppliers.size > 0 && ` • Выбрано: ${selectedSuppliers.size}`}
      </div>
    </div>
  );
}