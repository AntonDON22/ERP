import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Order, InsertOrder } from "@shared/schema";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
}

export function useOrder(id: number) {
  return useQuery<Order>({
    queryKey: ["/api/orders", id],
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertOrder) => apiRequest("/api/orders/create", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertOrder> }) =>
      apiRequest(`/api/orders/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/orders/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useDeleteOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest("/api/orders/delete-multiple", "POST", { orderIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}
