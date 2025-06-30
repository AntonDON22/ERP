import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { type Contractor } from "@shared/schema";
import { Search, Download, Trash2, ArrowUpDown, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

export default function ContractorsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractors, setSelectedContractors] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'website'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  const { data: contractors = [], isLoading, error } = useQuery({
    queryKey: ["/api/contractors"],
    enabled: true
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 1) {
        return apiRequest(`/api/contractors/${ids[0]}`, "DELETE");
      } else {
        return apiRequest("/api/contractors/delete-multiple", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
        });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setSelectedContractors(new Set());
      toast({
        title: "Контрагенты удалены",
        description: data.message || "Выбранные контрагенты успешно удалены"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить контрагентов",
        variant: "destructive"
      });
    }
  });

  const filteredContractors = useMemo(() => {
    if (!searchQuery) return contractors;
    
    return contractors.filter((contractor: Contractor) => {
      const searchLower = searchQuery.toLowerCase();
      return contractor.name.toLowerCase().includes(searchLower) ||
             (contractor.website && contractor.website.toLowerCase().includes(searchLower));
    });
  }, [contractors, searchQuery]);

  const sortedContractors = useMemo(() => {
    const sorted = [...filteredContractors].sort((a: Contractor, b: Contractor) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      const comparison = aValue.localeCompare(bValue, 'ru', { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredContractors, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'website') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContractors(new Set(sortedContractors.map((contractor: Contractor) => contractor.id)));
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
    const ids = Array.from(selectedContractors);
    if (ids.length === 0) {
      toast({
        title: "Не выбраны контрагенты",
        description: "Выберите контрагентов для удаления",
        variant: "destructive"
      });
      return;
    }

    const confirmMessage = ids.length === 1 
      ? "Удалить выбранного контрагента?" 
      : `Удалить ${ids.length} контрагентов?`;
    
    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(ids);
    }
  };

  const handleExportToExcel = () => {
    if (sortedContractors.length === 0) {
      toast({
        title: "Нет данных для экспорта",
        description: "Список контрагентов пуст",
        variant: "destructive"
      });
      return;
    }

    const exportData = sortedContractors.map((contractor: Contractor) => ({
      'Название': contractor.name,
      'Вебсайт': contractor.website || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Контрагенты");
    XLSX.writeFile(wb, "contractors.xlsx");

    toast({
      title: "Экспорт завершен",
      description: `Экспортировано ${sortedContractors.length} контрагентов`
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена"
      });
    }).catch(() => {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive"
      });
    });
  };

  const allSelected = sortedContractors.length > 0 && selectedContractors.size === sortedContractors.length;
  const someSelected = selectedContractors.size > 0 && selectedContractors.size < sortedContractors.length;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600">Не удалось загрузить список контрагентов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Контрагенты</h1>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </Button>
          {selectedContractors.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
              className="flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить ({selectedContractors.size})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Поиск по названию или вебсайту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Всего контрагентов: {sortedContractors.length}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left"
                style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
              >
                <Checkbox 
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: '488px', minWidth: '488px', maxWidth: '488px' }}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contractor.website || '')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}