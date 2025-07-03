import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@shared/apiRoutes";

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  reserved?: number;
  available?: number;
}

export function useInventory(warehouseId?: number) {
  const params = warehouseId ? `?warehouseId=${warehouseId}` : "";
  
  return useQuery<InventoryItem[]>({
    queryKey: [API_ROUTES.INVENTORY.LIST, warehouseId || "all"],
    queryFn: () => fetch(API_ROUTES.INVENTORY.LIST + params).then(res => res.json()),
  });
}

export function useInventoryAvailability(warehouseId?: number) {
  const params = warehouseId ? `?warehouseId=${warehouseId}` : "";
  
  return useQuery<InventoryItem[]>({
    queryKey: [API_ROUTES.INVENTORY.AVAILABILITY, warehouseId || "all"],
    queryFn: () => fetch(API_ROUTES.INVENTORY.AVAILABILITY + params).then(res => res.json()),
  });
}