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
    mutationFn: (data: CreateShipmentRequest) => apiRequest(API_ROUTES.SHIPMENTS.CREATE, "POST", data),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertShipment> }) => 
      apiRequest(API_ROUTES.SHIPMENTS.UPDATE(id), "PUT", data),
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
    mutationFn: (id: number) => apiRequest(API_ROUTES.SHIPMENTS.DELETE(id), "DELETE"),
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
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.SHIPMENTS.DELETE_MULTIPLE, "POST", { shipmentIds: ids }),
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



