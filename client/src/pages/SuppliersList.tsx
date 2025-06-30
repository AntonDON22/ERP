import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Upload, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
// import { type Product, type InsertProduct } from "@shared/schema";
import * as XLSX from 'xlsx';

// Типы для поставщиков
interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

interface InsertSupplier {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

interface ColumnWidths {
  name: number;
  contactPerson: number;
  email: number;
  phone: number;
  address: number;
  taxId: number;
}

export default function SuppliersList() {
  // Состояние компонента
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Supplier>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [isResizing, setIsResizing] = useState(false);

  // Настройки ширины столбцов с сохранением в localStorage
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = localStorage.getItem('supplierTableColumnWidths');
    return saved ? JSON.parse(saved) : {
      name: 300,
      contactPerson: 200,
      email: 250,
      phone: 150,
      address: 300,
      taxId: 150,
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

  // Заглушка данных поставщиков
  const mockSuppliers: Supplier[] = [
    {
      id: 1,
      name: "ООО \"Глобал Трейд\"",
      contactPerson: "Иванов Иван Иванович",
      email: "info@globaltrade.ru",
      phone: "+7 (495) 123-45-67",
      address: "г. Москва, ул. Тверская, д. 1",
      taxId: "7701234567"
    },
    {
      id: 2,
      name: "ИП Петров А.С.",
      contactPerson: "Петров Алексей Сергеевич",
      email: "petrov@example.com",
      phone: "+7 (812) 987-65-43",
      address: "г. Санкт-Петербург, пр. Невский, д. 100",
      taxId: "781098765432"
    },
    {
      id: 3,
      name: "ООО \"Северная компания\"",
      contactPerson: "Сидорова Мария Александровна",
      email: "maria@northcompany.ru",
      phone: "+7 (383) 555-12-34",
      address: "г. Новосибирск, ул. Красный проспект, д. 50",
      taxId: "5404123456"
    }
  ];

  const { data: suppliers = mockSuppliers, isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: false, // Отключаем запрос, используем заглушку
  });

  // Мутации для удаления поставщиков
  const deleteSelectedMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest("DELETE", "/api/suppliers/delete-multiple", { ids: supplierIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedSuppliers(new Set());
      toast({
        title: "Успешно",
        description: `Удалено поставщиков: ${selectedSuppliers.size}`,
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

  // Фильтрация поставщиков
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const query = searchQuery.toLowerCase();
      return (
        supplier.name.toLowerCase().includes(query) ||
        supplier.contactPerson.toLowerCase().includes(query) ||
        supplier.email.toLowerCase().includes(query) ||
        supplier.phone.toLowerCase().includes(query) ||
        supplier.taxId.toLowerCase().includes(query)
      );
    });
  }, [suppliers, searchQuery]);

  // Сортировка поставщиков
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue), 'ru', { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredSuppliers, sortField, sortDirection]);

  // Состояние выбора поставщиков
  const selectionState = useMemo(() => {
    const totalVisible = filteredSuppliers.length;
    const selectedCount = selectedSuppliers.size;
    const isAllSelected = totalVisible > 0 && selectedCount === totalVisible;
    const isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;

    return {
      totalVisible,
      selectedCount,
      isAllSelected,
      isIndeterminate
    };
  }, [filteredSuppliers.length, selectedSuppliers.size]);

  // Функции для работы с выбором поставщиков
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(filteredSuppliers.map(s => s.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  }, [filteredSuppliers]);

  const handleSelectSupplier = useCallback((supplierId: number, checked: boolean) => {
    setSelectedSuppliers(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(supplierId);
      } else {
        newSelected.delete(supplierId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedSuppliers.size === 0) return;
    deleteSelectedMutation.mutate(Array.from(selectedSuppliers));
  }, [selectedSuppliers, deleteSelectedMutation]);

  const handleSort = (field: keyof Supplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportToExcel = () => {
    if (!suppliers || suppliers.length === 0) {
      return;
    }

    const exportData = suppliers.map(supplier => ({
      'Название': supplier.name,
      'Контактное лицо': supplier.contactPerson,
      'Email': supplier.email,
      'Телефон': supplier.phone,
      'Адрес': supplier.address,
      'ИНН': supplier.taxId,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Поставщики");

    const fileName = `поставщики_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Сохраняем ширину колонок в localStorage
  useEffect(() => {
    localStorage.setItem('supplierTableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Обработчики изменения размера колонок (поддержка мыши и touch)
  const handleResizeStart = useCallback((startX: number, column: keyof ColumnWidths) => {
    console.log('Resize started for column:', column);
    setIsResizing(true);
    
    const startWidth = columnWidths[column];
    
    document.body.classList.add('table-resizing');
    document.body.style.cursor = 'col-resize';
    
    const handleMove = (currentX: number) => {
      const deltaX = currentX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth
      }));
    };
    
    const handleEnd = () => {
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
          {/* Search and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Поиск по названию, контактному лицу, email, телефону или ИНН..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectionState.selectedCount > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
                className="whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить ({selectionState.selectedCount})
              </Button>
            )}
          </div>

          {/* Import/Export buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="inline-flex items-center h-10"
              onClick={handleImportClick}
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

      {/* Suppliers Table */}
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
                      <span>Название</span>
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
                  style={{ width: `${columnWidths.contactPerson}px`, minWidth: `${columnWidths.contactPerson}px`, maxWidth: `${columnWidths.contactPerson}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("contactPerson")}
                    >
                      <span>Контактное лицо</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'contactPerson')}
                      onTouchStart={(e) => handleTouchStart(e, 'contactPerson')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.email}px`, minWidth: `${columnWidths.email}px`, maxWidth: `${columnWidths.email}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("email")}
                    >
                      <span>Email</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'email')}
                      onTouchStart={(e) => handleTouchStart(e, 'email')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.phone}px`, minWidth: `${columnWidths.phone}px`, maxWidth: `${columnWidths.phone}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("phone")}
                    >
                      <span>Телефон</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'phone')}
                      onTouchStart={(e) => handleTouchStart(e, 'phone')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.address}px`, minWidth: `${columnWidths.address}px`, maxWidth: `${columnWidths.address}px` }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-700"
                      onClick={() => handleSort("address")}
                    >
                      <span>Адрес</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <div
                      className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, 'address')}
                      onTouchStart={(e) => handleTouchStart(e, 'address')}
                      title="Потяните для изменения ширины столбца"
                    />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: `${columnWidths.taxId}px`, minWidth: `${columnWidths.taxId}px`, maxWidth: `${columnWidths.taxId}px` }}
                >
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort("taxId")}
                  >
                    <span>ИНН</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Загрузка поставщиков...
                  </td>
                </tr>
              ) : sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.name} type="Название" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.contactPerson} type="Контактное лицо" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.email} type="Email" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {supplier.phone}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {supplier.address}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <CopyableCell value={supplier.taxId} type="ИНН" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      {sortedSuppliers.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Показано {sortedSuppliers.length} из {suppliers.length} поставщиков
          {selectionState.selectedCount > 0 && ` • Выбрано: ${selectionState.selectedCount}`}
        </div>
      )}
    </div>
  );
}