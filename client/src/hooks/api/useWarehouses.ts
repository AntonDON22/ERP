import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Warehouse, InsertWarehouse } from "@shared/schema";

export function useWarehouses() {
  return useQuery<Warehouse[]>({
    queryKey: [API_ROUTES.WAREHOUSES.LIST],
  });
}

export function useWarehouse(id: number) {
  return useQuery<Warehouse>({
    queryKey: [API_ROUTES.WAREHOUSES.GET(id)],
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertWarehouse) => apiRequest(API_ROUTES.WAREHOUSES.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertWarehouse> }) =>
      apiRequest(API_ROUTES.WAREHOUSES.UPDATE(id), "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST, id] });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.WAREHOUSES.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST] });
    },
  });
}

export function useDeleteWarehouses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.WAREHOUSES.DELETE_MULTIPLE, "POST", { warehouseIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST] });
    },
  });
}

export function useImportWarehouses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest(API_ROUTES.WAREHOUSES.IMPORT, "POST", { warehouses: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.WAREHOUSES.LIST] });
    },
  });
}