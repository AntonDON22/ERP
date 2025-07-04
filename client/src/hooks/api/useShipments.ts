/**
 * 🚢 API ХУКИ ДЛЯ ОТГРУЗОК
 * 
 * Централизованные хуки для всех операций с отгрузками
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type {
  Shipment,
  CreateShipmentRequest,
  InsertShipment,
} from "@shared/schema";

// Получение всех отгрузок
export function useShipments() {
  return useQuery<Shipment[]>({
    queryKey: [API_ROUTES.SHIPMENTS.LIST],
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

// Получение отдельной отгрузки
export function useShipment(id: number) {
  return useQuery<Shipment>({
    queryKey: [API_ROUTES.SHIPMENTS.LIST, id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Создание отгрузки
export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShipmentRequest) => {
      return await apiRequest(API_ROUTES.SHIPMENTS.CREATE, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      // Инвалидируем кеш отгрузок
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST],
      });
      
      // Инвалидируем кеш остатков (отгрузки влияют на остатки)
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.AVAILABILITY],
      });
    },
  });
}

// Обновление отгрузки
export function useUpdateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertShipment> }) => {
      return await apiRequest(API_ROUTES.SHIPMENTS.UPDATE.replace(":id", id.toString()), {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, { id }) => {
      // Инвалидируем конкретную отгрузку
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST, id],
      });
      
      // Инвалидируем список отгрузок
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST],
      });
      
      // Инвалидируем кеш остатков
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.AVAILABILITY],
      });
    },
  });
}

// Удаление отгрузки
export function useDeleteShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(API_ROUTES.SHIPMENTS.DELETE.replace(":id", id.toString()), {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Инвалидируем кеш отгрузок
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST],
      });
      
      // Инвалидируем кеш остатков
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.AVAILABILITY],
      });
    },
  });
}

// Множественное удаление отгрузок
export function useDeleteShipments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      return await apiRequest(API_ROUTES.SHIPMENTS.DELETE_MULTIPLE, {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      // Инвалидируем кеш отгрузок
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST],
      });
      
      // Инвалидируем кеш остатков
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.AVAILABILITY],
      });
    },
  });
}

// Экспорт в Excel
export function useExportShipments() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(API_ROUTES.SHIPMENTS.EXPORT);
      if (!response.ok) {
        throw new Error("Ошибка экспорта отгрузок");
      }
      return response.blob();
    },
  });
}

// Импорт из Excel
export function useImportShipments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return await apiRequest(API_ROUTES.SHIPMENTS.IMPORT, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      // Инвалидируем кеш отгрузок после импорта
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.SHIPMENTS.LIST],
      });
      
      // Инвалидируем кеш остатков
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ROUTES.INVENTORY.AVAILABILITY],
      });
    },
  });
}

// Получение статистики отгрузок
export function useShipmentStats() {
  return useQuery({
    queryKey: [API_ROUTES.SHIPMENTS.LIST, "stats"],
    queryFn: async () => {
      const shipments = await apiRequest(API_ROUTES.SHIPMENTS.LIST);
      
      return {
        total: shipments.length,
        draft: shipments.filter((s: Shipment) => s.status === "draft").length,
        shipped: shipments.filter((s: Shipment) => s.status === "shipped").length,
        delivered: shipments.filter((s: Shipment) => s.status === "delivered").length,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}