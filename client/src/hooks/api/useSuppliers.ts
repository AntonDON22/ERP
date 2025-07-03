import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Supplier, InsertSupplier } from "@shared/schema";

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: [API_ROUTES.SUPPLIERS.LIST],
  });
}

export function useSupplier(id: number) {
  return useQuery<Supplier>({
    queryKey: [API_ROUTES.SUPPLIERS.LIST, id],
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertSupplier) => apiRequest(API_ROUTES.SUPPLIERS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSupplier> }) =>
      apiRequest(API_ROUTES.SUPPLIERS.UPDATE(id), "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST, id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.SUPPLIERS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST] });
    },
  });
}

export function useDeleteSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.SUPPLIERS.DELETE_MULTIPLE, "POST", { supplierIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST] });
    },
  });
}

export function useImportSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest(API_ROUTES.SUPPLIERS.IMPORT, "POST", { suppliers: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SUPPLIERS.LIST] });
    },
  });
}