import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import type { DocumentRecord, InsertDocument } from "@shared/schema";

export interface CreateDocumentItem {
  productId: number;
  quantity: number;
}

// Расширенный тип документа с позициями
export interface DocumentWithItems extends DocumentRecord {
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
  }>;
}

export function useDocuments() {
  return useQuery<DocumentWithItems[]>({
    queryKey: [API_ROUTES.DOCUMENTS.LIST],
  });
}

export function useDocument(id: number) {
  return useQuery<DocumentWithItems>({
    queryKey: [API_ROUTES.DOCUMENTS.GET(id)],
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { document: InsertDocument; items: CreateDocumentItem[] }) =>
      apiRequest(API_ROUTES.DOCUMENTS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
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
    }) => apiRequest(API_ROUTES.DOCUMENTS.UPDATE(id), "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST, id] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiRequest(API_ROUTES.DOCUMENTS.DELETE(id), "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}

export function useCreateReceiptDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => apiRequest(API_ROUTES.DOCUMENTS.CREATE, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.AVAILABILITY] });
    },
  });
}

export function useDeleteDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiRequest(API_ROUTES.DOCUMENTS.DELETE_MULTIPLE, "POST", { documentIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
    },
  });
}
