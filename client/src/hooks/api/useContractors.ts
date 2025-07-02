import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Contractor, InsertContractor } from "@shared/schema";

export function useContractors() {
  return useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
  });
}

export function useContractor(id: number) {
  return useQuery<Contractor>({
    queryKey: ["/api/contractors", id],
    enabled: !!id,
  });
}

export function useCreateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertContractor) => apiRequest("/api/contractors", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertContractor> }) =>
      apiRequest(`/api/contractors/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", id] });
    },
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/contractors/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
}

export function useDeleteContractors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest("/api/contractors/delete-multiple", "POST", { contractorIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
}

export function useImportContractors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown[]) => apiRequest("/api/contractors/import", "POST", { contractors: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
}