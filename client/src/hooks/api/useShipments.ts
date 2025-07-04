import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@shared/utils";

export interface ShipmentItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface Shipment {
  id: number;
  orderId: number;
  warehouseId: number;
  status: "draft" | "prepared" | "shipped" | "delivered" | "cancelled";
  date: string;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
  responsibleUserId: number | null;
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

export function useShipments(orderId: number) {
  return useQuery({
    queryKey: ["shipments", orderId],
    queryFn: () => apiRequest(`/api/orders/${orderId}/shipments`),
  });
}

export function useShipment(orderId: number, shipmentId: number) {
  return useQuery({
    queryKey: ["shipments", orderId, shipmentId],
    queryFn: () => apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`),
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateShipmentData) => 
      apiRequest(`/api/orders/${data.orderId}/shipments`, "POST", data),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
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

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, shipmentId, data }: { orderId: number; shipmentId: number; data: UpdateShipmentData }) => 
      apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`, "PUT", data),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
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

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, shipmentId }: { orderId: number; shipmentId: number }) => 
      apiRequest(`/api/orders/${orderId}/shipments/${shipmentId}`, "DELETE"),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
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