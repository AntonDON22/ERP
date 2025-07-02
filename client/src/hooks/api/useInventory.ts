import { useQuery } from "@tanstack/react-query";

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  reserved?: number;
  available?: number;
}

export function useInventory(warehouseId?: number) {
  const queryParams = warehouseId ? `?warehouseId=${warehouseId}` : "";

  return useQuery<InventoryItem[]>({
    queryKey: [`/api/inventory${queryParams}`],
  });
}

export function useInventoryAvailability() {
  return useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/availability"],
  });
}
