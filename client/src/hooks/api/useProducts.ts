import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Product, InsertProduct } from "@shared/schema";

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [API_ROUTES.PRODUCTS.LIST],
  });
}

export function useProduct(id: number) {
  return useQuery<Product>({
    queryKey: [API_ROUTES.PRODUCTS.GET(id)],
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(API_ROUTES.PRODUCTS.CREATE, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.PRODUCTS.LIST] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await fetch(API_ROUTES.PRODUCTS.UPDATE(id), {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.PRODUCTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.PRODUCTS.LIST, id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.PRODUCTS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.PRODUCTS.LIST] });
    },
  });
}

export function useDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.PRODUCTS.DELETE_MULTIPLE, "POST", { productIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.PRODUCTS.LIST] });
    },
  });
}
