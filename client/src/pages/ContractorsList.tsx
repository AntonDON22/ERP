import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { type Contractor } from "@shared/schema";
import { Search, Download, Trash2, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

export default function ContractorsList() {
  const [search, setSearch] = useState("");
  const [selectedContractors, setSelectedContractors] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: contractors = [], isLoading, error } = useQuery({
    queryKey: ["/api/contractors"],
    enabled: true
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("/api/contractors/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({
        title: "Успешно удалено",
        description: response.message || "Контрагенты удалены",
      });
      setSelectedContractors([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить контрагентов",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  const filteredContractors = contractors.filter((contractor: Contractor) => {
    const searchLower = search.toLowerCase();
    return contractor.name.toLowerCase().includes(searchLower) ||
           (contractor.website && contractor.website.toLowerCase().includes(searchLower));
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContractors(filteredContractors.map((contractor: Contractor) => contractor.id));
    } else {
      setSelectedContractors([]);
    }
  };

  const handleSelectContractor = (contractorId: number, checked: boolean) => {
    if (checked) {
      setSelectedContractors(prev => [...prev, contractorId]);
    } else {
      setSelectedContractors(prev => prev.filter(id => id !== contractorId));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedContractors.length === 0) {
      toast({
        title: "Не выбраны контрагенты",
        description: "Выберите контрагентов для удаления",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Удалить ${selectedContractors.length} контрагентов?`)) {
      deleteMutation.mutate(selectedContractors);
    }
  };

  const handleExportToExcel = () => {
    if (filteredContractors.length === 0) {
      toast({
        title: "Нет данных для экспорта",
        description: "Список контрагентов пуст",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredContractors.map((contractor: Contractor) => ({
      'Название': contractor.name,
      'Вебсайт': contractor.website || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Контрагенты");
    XLSX.writeFile(wb, "contractors.xlsx");

    toast({
      title: "Экспорт завершен",
      description: `Экспортировано ${filteredContractors.length} контрагентов`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена",
      });
    }).catch(() => {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive",
      });
    });
  };

  const isAllSelected = filteredContractors.length > 0 && 
    selectedContractors.length === filteredContractors.length;
  const isIndeterminate = selectedContractors.length > 0 && 
    selectedContractors.length < filteredContractors.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Контрагенты</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
          {selectedContractors.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Удалить ({selectedContractors.length})
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Поиск по названию или вебсайту..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Всего контрагентов: {filteredContractors.length}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isIndeterminate;
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                  Название
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                  Вебсайт
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredContractors.length > 0 ? (
                filteredContractors.map((contractor: Contractor) => (
                  <tr key={contractor.id} className="hover:bg-gray-50 h-20">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedContractors.includes(contractor.id)}
                        onCheckedChange={(checked) => 
                          handleSelectContractor(contractor.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="font-medium text-gray-900 leading-5 line-clamp-2 overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word'
                          }}
                        >
                          {contractor.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contractor.name)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="text-gray-900 leading-5 line-clamp-2 overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word'
                          }}
                        >
                          {contractor.website ? (
                            <a 
                              href={contractor.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {contractor.website}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        {contractor.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contractor.website || '')}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                    {search ? "Контрагенты не найдены" : "Контрагенты отсутствуют"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}