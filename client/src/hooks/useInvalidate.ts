import { useQueryClient } from "@tanstack/react-query";

/**
 * Централизованный хук для инвалидации кеша React Query
 * Предоставляет методы для всех ключевых сущностей системы
 */
export function useInvalidate() {
  const queryClient = useQueryClient();

  return {
    // Товары
    products: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    product: (id: number) => queryClient.invalidateQueries({ queryKey: ['product', id] }),
    
    // Поставщики
    suppliers: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    supplier: (id: number) => queryClient.invalidateQueries({ queryKey: ['supplier', id] }),
    
    // Контрагенты
    contractors: () => queryClient.invalidateQueries({ queryKey: ['contractors'] }),
    contractor: (id: number) => queryClient.invalidateQueries({ queryKey: ['contractor', id] }),
    
    // Склады
    warehouses: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
    warehouse: (id: number) => queryClient.invalidateQueries({ queryKey: ['warehouse', id] }),
    
    // Документы
    documents: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    document: (id: number) => queryClient.invalidateQueries({ queryKey: ['document', id] }),
    
    // Заказы
    orders: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    order: (id: number) => queryClient.invalidateQueries({ queryKey: ['order', id] }),
    
    // Инвентарь и остатки
    inventory: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    inventoryAvailability: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'availability'] }),
    
    // Комплексная инвалидация для связанных данных
    inventoryRelated: () => {
      // Инвалидируем все связанные с инвентарем данные
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'availability'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    
    documentRelated: () => {
      // Инвалидируем документы и связанные данные
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'availability'] });
    },
    
    orderRelated: () => {
      // Инвалидируем заказы и связанные данные
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'availability'] });
    },
    
    // Полная инвалидация всех данных
    all: () => queryClient.invalidateQueries(),
  };
}