import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";

export function usePostDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`${API_ROUTES.DOCUMENTS.UPDATE(documentId)}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.AVAILABILITY] });
    },
  });
}

export function useUnpostDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`${API_ROUTES.DOCUMENTS.UPDATE(documentId)}/unpost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.AVAILABILITY] });
    },
  });
}

export function useToggleDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`${API_ROUTES.DOCUMENTS.UPDATE(documentId)}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.DOCUMENTS.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.LIST] });
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.INVENTORY.AVAILABILITY] });
    },
  });
}
