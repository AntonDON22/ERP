import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ROUTES } from "@shared/apiRoutes";
import { type Shipment, type InsertShipment } from "@shared/schema";

export function useShipments() {
  return useQuery({
    queryKey: [API_ROUTES.SHIPMENTS.LIST],
    queryFn: () => apiRequest(API_ROUTES.SHIPMENTS.LIST),
  });
}

export function useShipment(id: number) {
  return useQuery({
    queryKey: [API_ROUTES.SHIPMENTS.GET, id],
    queryFn: () => apiRequest(API_ROUTES.SHIPMENTS.GET(id)),
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shipment: InsertShipment) =>
      apiRequest<Shipment>(API_ROUTES.SHIPMENTS.CREATE, {
        method: "POST",
        body: JSON.stringify(shipment),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, shipment }: { id: number; shipment: Partial<InsertShipment> }) =>
      apiRequest<Shipment>(API_ROUTES.SHIPMENTS.UPDATE.replace(":id", id.toString()), {
        method: "PUT",
        body: JSON.stringify(shipment),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(API_ROUTES.SHIPMENTS.DELETE.replace(":id", id.toString()), {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
    },
  });
}

export function useDeleteShipments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest(API_ROUTES.SHIPMENTS.DELETE_MULTIPLE, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.SHIPMENTS.LIST] });
    },
  });
}