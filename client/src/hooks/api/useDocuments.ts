import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { DocumentRecord, InsertDocument } from "@shared/schema";

export interface CreateDocumentItem {
  productId: number;
  quantity: number;
}

export function useDocuments() {
  return useQuery<DocumentRecord[]>({
    queryKey: ["/api/documents"],
  });
}

export function useDocument(id: number) {
  return useQuery<DocumentRecord>({
    queryKey: ["/api/documents", id],
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { document: InsertDocument; items: CreateDocumentItem[] }) =>
      apiRequest("/api/documents", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { document: Partial<InsertDocument>; items: CreateDocumentItem[] };
    }) => apiRequest(`/api/documents/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/documents/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useCreateReceiptDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiRequest("/api/documents/receipt", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/availability"] });
    },
  });
}

export function useDeleteDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest("/api/documents/delete-multiple", "POST", { documentIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}
