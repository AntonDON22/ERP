import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@shared/utils";
import type { Shipment } from "@shared/schema";

export interface ShipmentItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface CreateShipmentData {
  orderId: number;
  date: string;
  warehouseId: number;
  comments?: string;
  items: ShipmentItem[];
}

export interface UpdateShipmentData {
  status?: string;
  comments?: string;
  items?: ShipmentItem[];
}

// Получение отгрузок для заказа
export function useShipments(orderId: number) {
  return useQuery({
    queryKey: ["shipments", orderId],
    queryFn: () => apiRequest(`/api/orders/${orderId}/shipments`),
    enabled: !!orderId,
  });
}

// Получение отгрузки по ID
export function useShipment(orderId: number, shipmentId: number) {
  return useQuery({
    queryKey: ["shipments", orderId, shipmentId],
    queryFn: () => apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`),
    enabled: !!orderId && !!shipmentId,
  });
}

// Создание отгрузки
export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateShipmentData) => 
      apiRequest(`/api/orders/${data.orderId}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast({
        title: "Отгрузка создана",
        description: `Отгрузка #${data.id} успешно создана`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка при создании отгрузки",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

// Обновление отгрузки
export function useUpdateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, shipmentId, data }: { orderId: number; shipmentId: number; data: UpdateShipmentData }) => 
      apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId, variables.shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast({
        title: "Отгрузка обновлена",
        description: `Отгрузка #${data.id} успешно обновлена`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка при обновлении отгрузки",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

// Удаление отгрузки
export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, shipmentId }: { orderId: number; shipmentId: number }) => 
      apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast({
        title: "Отгрузка удалена",
        description: `Отгрузка #${variables.shipmentId} успешно удалена`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка при удалении отгрузки",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

// Получение всех отгрузок (для общей страницы)
export function useAllShipments() {
  return useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const orders = await apiRequest("/api/orders");
      const shipmentsPromises = orders.map(async (order: any) => {
        try {
          const shipments = await apiRequest(`/api/orders/${order.id}/shipments`);
          return shipments.map((shipment: any) => ({
            ...shipment,
            orderName: order.name,
            warehouseName: order.warehouseName || "Не указан",
          }));
        } catch {
          return [];
        }
      });
      const shipmentsArrays = await Promise.all(shipmentsPromises);
      return shipmentsArrays.flat();
    },
  });
}