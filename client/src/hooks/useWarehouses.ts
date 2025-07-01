import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Warehouse } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

export const useWarehouses = () => {
  return useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
};

export const useDeleteWarehouses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warehouseIds: number[]) => {
      return apiRequest("/api/warehouses", "DELETE", { warehouseIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/warehouses", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
};

export const useImportWarehouses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warehouses: any[]) => {
      return apiRequest("/api/warehouses/import", "POST", { warehouses });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });
};