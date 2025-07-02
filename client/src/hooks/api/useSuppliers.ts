import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
}

export function useSupplier(id: number) {
  return useQuery<Supplier>({
    queryKey: ["/api/suppliers", id],
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertSupplier) => apiRequest("/api/suppliers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSupplier> }) =>
      apiRequest(`/api/suppliers/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/suppliers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}

export function useDeleteSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest("/api/suppliers/delete-multiple", "POST", { supplierIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}

export function useImportSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest("/api/suppliers/import", "POST", { suppliers: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}