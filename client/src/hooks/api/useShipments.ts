import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@shared/utils";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Shipment, ShipmentItem } from "@shared/schema";

export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

export interface CreateShipmentData {
  orderId: number;
  date: string;
  warehouseId: number;
  comments?: string;
  items: {
    productId: number;
    quantity: number;
    price: number;
  }[];
}

export interface UpdateShipmentData {
  status?: string;
  comments?: string;
  items?: {
    productId: number;
    quantity: number;
    price: number;
  }[];
}

// Получение всех отгрузок
export function useShipments() {
  return useQuery<ShipmentWithItems[]>({
    queryKey: [API_ROUTES.SHIPMENTS.LIST],
    queryFn: async () => {
      const response = await apiRequest(API_ROUTES.SHIPMENTS.LIST);
      return response.json();
    },
  });
}

// Получение одной отгрузки
export function useShipment(shipmentId: number) {
  return useQuery<ShipmentWithItems>({
    queryKey: [API_ROUTES.SHIPMENTS.GET(shipmentId)],
    queryFn: async () => {
      const response = await apiRequest(API_ROUTES.SHIPMENTS.GET(shipmentId));
      return response.json();
    },
    enabled: !!shipmentId,
  });
}

// Создание отгрузки
export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateShipmentData) => 
      apiRequest(API_ROUTES.SHIPMENTS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
      toast({
        title: "Отгрузка создана",
        description: "Отгрузка успешно создана",
      });
    },
    onError: (error: any) => {
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
    mutationFn: ({ id, data }: { id: number; data: UpdateShipmentData }) => 
      apiRequest(API_ROUTES.SHIPMENTS.UPDATE(id), "PUT", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.GET(variables.id)] });
      toast({
        title: "Отгрузка обновлена",
        description: "Отгрузка успешно обновлена",
      });
    },
    onError: (error: any) => {
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
    mutationFn: (id: number) => 
      apiRequest(API_ROUTES.SHIPMENTS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
      toast({
        title: "Отгрузка удалена",
        description: "Отгрузка успешно удалена",
      });
    },
    onError: (error: any) => {
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
      try {
        // Сначала получаем все заказы
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orders = await response.json();
        
        // Убедимся что orders это массив
        if (!Array.isArray(orders)) {
          return [];
        }
        
        // Затем для каждого заказа получаем отгрузки
        const allShipments: Shipment[] = [];
        
        for (const order of orders) {
          try {
            const shipmentsResponse = await fetch(`/api/orders/${order.id}/shipments`);
            if (!shipmentsResponse.ok) {
              continue; // Пропускаем заказы без отгрузок
            }
            const shipments = await shipmentsResponse.json();
            
            if (!Array.isArray(shipments)) {
              continue;
            }
            
            // Добавляем информацию о заказе к каждой отгрузке
            const shipmentsWithOrderInfo = shipments.map((shipment: any) => ({
              ...shipment,
              orderId: order.id,
              orderName: order.name,
            }));
            allShipments.push(...shipmentsWithOrderInfo);
          } catch (error) {
            // Если для заказа нет отгрузок, пропускаем
            continue;
          }
        }
        
        return allShipments;
      } catch (error) {
        throw error;
      }
    },
  });
}