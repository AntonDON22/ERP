import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Product,
  Supplier,
  Contractor,
  DocumentRecord,
  InsertProduct,
  InsertSupplier,
  InsertContractor,
  Warehouse,
  InsertWarehouse,
  Order,
  OrderItem,
} from "@shared/schema";
import {
  OrderWithItems,
  DocumentWithItems,
  CreateOrderData,
  CreateDocumentData,
  UpdateOrderData,
  UpdateDocumentData,
  InventoryItem,
  InventoryAvailabilityItem,
} from "@shared/types";
import { apiRequest, apiRequestJson, getQueryFn } from "@/lib/queryClient";
import { useInvalidate } from "./useInvalidate";

// Типизированные хуки для продуктов
export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => apiRequestJson<Product[]>("/api/products"),
  });
};

export const useProduct = (id: number) => {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => apiRequestJson<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
};

export const useDeleteProducts = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (productIds: number[]) => {
      return apiRequest("/api/products/delete-multiple", "POST", { productIds });
    },
    onSuccess: () => {
      invalidate.products();
      invalidate.inventoryRelated();
    },
  });
};

export const useImportProducts = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (productsData: InsertProduct[]) => {
      return apiRequest("/api/products/import", "POST", { products: productsData });
    },
    onSuccess: () => {
      invalidate.products();
    },
  });
};

// Типизированные хуки для поставщиков
export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => apiRequestJson<Supplier[]>("/api/suppliers"),
  });
};

export const useSupplier = (id: number) => {
  return useQuery<Supplier>({
    queryKey: ["supplier", id],
    queryFn: () => apiRequestJson<Supplier>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
};

export const useDeleteSuppliers = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest("/api/suppliers/delete-multiple", "POST", { supplierIds });
    },
    onSuccess: () => {
      invalidate.suppliers();
    },
  });
};

export const useImportSuppliers = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (suppliersData: InsertSupplier[]) => {
      return apiRequest("/api/suppliers/import", "POST", { suppliers: suppliersData });
    },
    onSuccess: () => {
      invalidate.suppliers();
    },
  });
};

export const useCreateSupplier = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (supplierData: InsertSupplier) => {
      return apiRequest("/api/suppliers", "POST", supplierData);
    },
    onSuccess: () => {
      invalidate.suppliers();
    },
  });
};

// Типизированные хуки для контрагентов
export const useContractors = () => {
  return useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: () => apiRequestJson<Contractor[]>("/api/contractors"),
  });
};

export const useContractor = (id: number) => {
  return useQuery<Contractor>({
    queryKey: ["contractor", id],
    queryFn: () => apiRequestJson<Contractor>(`/api/contractors/${id}`),
    enabled: !!id,
  });
};

export const useDeleteContractors = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (contractorIds: number[]) => {
      return apiRequest("/api/contractors/delete-multiple", "POST", { contractorIds });
    },
    onSuccess: () => {
      invalidate.contractors();
    },
  });
};

export const useImportContractors = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (contractorsData: InsertContractor[]) => {
      return apiRequest("/api/contractors/import", "POST", { contractors: contractorsData });
    },
    onSuccess: () => {
      invalidate.contractors();
    },
  });
};

export const useCreateContractor = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (contractorData: InsertContractor) => {
      return apiRequest("/api/contractors", "POST", contractorData);
    },
    onSuccess: () => {
      invalidate.contractors();
    },
  });
};

// Типизированные хуки для документов
export const useDocuments = () => {
  return useQuery<DocumentRecord[]>({
    queryKey: ["documents"],
    queryFn: () => apiRequestJson<DocumentRecord[]>("/api/documents"),
  });
};

export const useDeleteDocuments = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("/api/documents/delete-multiple", "POST", { documentIds: ids });
    },
    onSuccess: () => {
      invalidate.documentRelated();
    },
  });
};

// Типизированный хук для остатков
export const useInventory = (warehouseId?: number) => {
  const url = warehouseId ? `/api/inventory?warehouseId=${warehouseId}` : "/api/inventory";

  return useQuery<{ id: number; name: string; quantity: number }[]>({
    queryKey: warehouseId ? ["inventory", "warehouse", warehouseId] : ["inventory"],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }
      return response.json();
    },
  });
};

// Типизированный хук для доступности товаров (с учетом резервов)
export const useInventoryAvailability = (warehouseId?: number) => {
  const url = warehouseId
    ? `/api/inventory/availability?warehouseId=${warehouseId}`
    : "/api/inventory/availability";

  return useQuery<InventoryAvailabilityItem[]>({
    queryKey: warehouseId
      ? ["inventory", "availability", "warehouse", warehouseId]
      : ["inventory", "availability"],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory availability");
      }
      return response.json();
    },
  });
};

export const useCreateReceiptDocument = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (documentData: CreateDocumentData) => {
      return apiRequest("/api/documents/create-receipt", "POST", documentData);
    },
    onSuccess: () => {
      invalidate.documentRelated();
    },
  });
};
export const useDocument = (id: number) => {
  return useQuery<DocumentWithItems>({
    queryKey: ["document", id],
    queryFn: () => apiRequestJson<DocumentWithItems>(`/api/documents/${id}`),
    enabled: !!id,
  });
};

export const useUpdateDocument = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateDocumentData) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update document");
      }
      return response.json();
    },
    onSuccess: (data, { id }) => {
      invalidate.document(id);
      invalidate.documentRelated();
    },
  });
};

// Типизированные хуки для заказов
export const useOrders = () => {
  return useQuery<OrderWithItems[]>({
    queryKey: ["orders"],
    queryFn: () => apiRequestJson<OrderWithItems[]>("/api/orders"),
  });
};

export const useDeleteOrders = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (orderIds: number[]) => {
      return apiRequest("/api/orders/delete-multiple", "POST", { orderIds });
    },
    onSuccess: () => {
      invalidate.orderRelated();
    },
  });
};

export const useCreateOrder = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      return apiRequest("/api/orders/create", "POST", orderData);
    },
    onSuccess: () => {
      invalidate.orderRelated();
    },
  });
};

export const useOrder = (id: number) => {
  return useQuery<OrderWithItems>({
    queryKey: ["order", id],
    queryFn: () => apiRequestJson<OrderWithItems>(`/api/orders/${id}`),
    enabled: !!id,
  });
};

export const useUpdateOrder = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateOrderData) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update order");
      }
      return response.json();
    },
    onSuccess: (data, { id }) => {
      invalidate.order(id);
      invalidate.orderRelated();
    },
  });
};

// Типизированные хуки для складов
export const useWarehouses = () => {
  return useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: () => apiRequestJson<Warehouse[]>("/api/warehouses"),
  });
};

export const useWarehouse = (id: number) => {
  return useQuery<Warehouse>({
    queryKey: ["warehouse", id],
    queryFn: () => apiRequestJson<Warehouse>(`/api/warehouses/${id}`),
    enabled: !!id,
  });
};

export const useDeleteWarehouses = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (warehouseIds: number[]) => {
      return apiRequest("/api/warehouses/delete-multiple", "POST", { warehouseIds });
    },
    onSuccess: () => {
      invalidate.warehouses();
    },
  });
};

export const useImportWarehouses = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: any[]) => {
      return apiRequest("/api/warehouses/import", "POST", { warehouses: data });
    },
    onSuccess: () => {
      invalidate.warehouses();
    },
  });
};

export const useCreateWarehouse = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (warehouseData: InsertWarehouse) => {
      return apiRequest("/api/warehouses", "POST", warehouseData);
    },
    onSuccess: () => {
      invalidate.warehouses();
    },
  });
};
