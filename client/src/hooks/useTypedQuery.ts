import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product, Supplier, Contractor, InsertProduct, InsertSupplier, InsertContractor } from "@shared/schema";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";

// Типизированные хуки для продуктов
export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
};

export const useDeleteProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: number[]) => {
      return apiRequest("/api/products/delete-multiple", "POST", { ids: productIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
};

export const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productsData: InsertProduct[]) => {
      return apiRequest("/api/products/import", "POST", { products: productsData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
};

// Типизированные хуки для поставщиков
export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
};

export const useDeleteSuppliers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest("/api/suppliers/delete-multiple", "POST", { ids: supplierIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
};

export const useImportSuppliers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suppliersData: InsertSupplier[]) => {
      return apiRequest("/api/suppliers/import", "POST", { suppliers: suppliersData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
};

// Типизированные хуки для контрагентов
export const useContractors = () => {
  return useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
  });
};

export const useDeleteContractors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractorIds: number[]) => {
      return apiRequest("/api/contractors/delete-multiple", "POST", { ids: contractorIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
};

export const useImportContractors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractorsData: InsertContractor[]) => {
      return apiRequest("/api/contractors/import", "POST", { contractors: contractorsData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
};