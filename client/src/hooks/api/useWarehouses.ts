import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Warehouse, InsertWarehouse } from "@shared/schema";

export function useWarehouses() {
  return useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
}

export function useWarehouse(id: number) {
  return useQuery<Warehouse>({
    queryKey: ["/api/warehouses", id],
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertWarehouse) => apiRequest("/api/warehouses", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertWarehouse> }) =>
      apiRequest(`/api/warehouses/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses", id] });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/warehouses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
}

export function useDeleteWarehouses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest("/api/warehouses/delete-multiple", "POST", { warehouseIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
}

export function useImportWarehouses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest("/api/warehouses/import", "POST", { warehouses: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
}