import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { Contractor, InsertContractor } from "@shared/schema";

export function useContractors() {
  return useQuery<Contractor[]>({
    queryKey: [API_ROUTES.CONTRACTORS.LIST],
  });
}

export function useContractor(id: number) {
  return useQuery<Contractor>({
    queryKey: [API_ROUTES.CONTRACTORS.LIST, id],
    enabled: !!id,
  });
}

export function useCreateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertContractor) => apiRequest(API_ROUTES.CONTRACTORS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST] });
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertContractor> }) =>
      apiRequest(API_ROUTES.CONTRACTORS.UPDATE(id), "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST, id] });
    },
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.CONTRACTORS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST] });
    },
  });
}

export function useDeleteContractors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.CONTRACTORS.DELETE_MULTIPLE, "POST", { contractorIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST] });
    },
  });
}

export function useImportContractors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest(API_ROUTES.CONTRACTORS.IMPORT, "POST", { contractors: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.CONTRACTORS.LIST] });
    },
  });
}