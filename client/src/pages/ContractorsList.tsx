import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Upload, Trash2, ArrowUpDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

import { type Contractor, type InsertContractor } from "@shared/schema";

export default function ContractorsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Contractor>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedContractors, setSelectedContractors] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["/api/contractors"],
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (contractorIds: number[]) => {
      const response = await fetch("/api/contractors/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: contractorIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка при удалении контрагентов");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSelectedContractors(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({
        title: "Успешно",
        description: "Выбранные контрагенты удалены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить контрагентов",
        variant: "destructive",
      });
    },
  });

  const handleSort = (field: keyof Contractor) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContractors(new Set(sortedContractors.map(s => s.id)));
    } else {
      setSelectedContractors(new Set());
    }
  };

  const handleSelectContractor = (contractorId: number, checked: boolean) => {
    const newSelected = new Set(selectedContractors);
    if (checked) {
      newSelected.add(contractorId);
    } else {
      newSelected.delete(contractorId);
    }
    setSelectedContractors(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedContractors.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedContractors));
  };

  const filteredContractors = contractors.filter((contractor: Contractor) => {
    const query = searchQuery.toLowerCase();
    return (
      contractor.name.toLowerCase().includes(query) ||
      (contractor.website && contractor.website.toLowerCase().includes(query))
    );
  });

  const sortedContractors = [...filteredContractors].sort((a, b) => {
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
    selectedCount: selectedContractors.size,
    isAllSelected: sortedContractors.length > 0 && selectedContractors.size === sortedContractors.length,
    isIndeterminate: selectedContractors.size > 0 && selectedContractors.size < sortedContractors.length
  };

  const handleExportToExcel = () => {
    const exportData = contractors.map((contractor: Contractor) => ({
      'Название': contractor.name,
      'Вебсайт': contractor.website || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Контрагенты");

    const fileName = `контрагенты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
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
          <div className="text-lg text-gray-500">Загрузка контрагентов...</div>
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
            {selectedContractors.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Удалить ({selectedContractors.size})
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
              disabled={!contractors || contractors.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Экспорт
            </Button>
          </div>
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            Найдено контрагентов: {sortedContractors.length} из {contractors.length}
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

      {/* Contractors Table */}
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
              ) : sortedContractors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "Контрагенты не найдены" : "Нет контрагентов для отображения"}
                  </td>
                </tr>
              ) : (
                sortedContractors.map((contractor) => (
                  <tr key={contractor.id} className="hover:bg-gray-50 h-20">
                    <td className="px-4 py-4 w-12">
                      <Checkbox
                        checked={selectedContractors.has(contractor.id)}
                        onCheckedChange={(checked) => handleSelectContractor(contractor.id, checked as boolean)}
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
                      }} title={contractor.name}>
                        {contractor.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate">
                      {contractor.website ? (
                        <div className="flex items-center gap-2 truncate">
                          <a
                            href={contractor.website.startsWith('http') ? contractor.website : `https://${contractor.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={contractor.website}
                          >
                            {contractor.website}
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
        Всего контрагентов: {contractors.length}
        {selectedContractors.size > 0 && ` • Выбрано: ${selectedContractors.size}`}
      </div>
    </div>
  );
}