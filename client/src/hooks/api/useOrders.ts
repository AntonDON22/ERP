import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Order, InsertOrder } from "@shared/schema";

// Расширенный тип заказа с позициями
export interface OrderWithItems extends Order {
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
  }>;
}

export function useOrders() {
  return useQuery<OrderWithItems[]>({
    queryKey: [API_ROUTES.ORDERS.LIST],
  });
}

export function useOrder(id: number) {
  return useQuery<OrderWithItems>({
    queryKey: [API_ROUTES.ORDERS.LIST, id],
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertOrder) => apiRequest(API_ROUTES.ORDERS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.ORDERS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertOrder> }) =>
      apiRequest(API_ROUTES.ORDERS.UPDATE(id), "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.ORDERS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.ORDERS.LIST, id] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.ORDERS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.ORDERS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}

export function useDeleteOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.ORDERS.DELETE_MULTIPLE, "POST", { orderIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.ORDERS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}
