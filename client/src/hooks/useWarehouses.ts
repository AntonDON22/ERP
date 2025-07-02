import { useQuery } from "@tanstack/react-query";

export const useWarehouses = () => {
  return useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });
};
