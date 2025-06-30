import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product, Supplier, Contractor, DocumentRecord, InsertProduct, InsertSupplier, InsertContractor } from "@shared/schema";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";

// Типизированные хуки для продуктов
export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
};

export const useDeleteProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: number[]) => {
      return apiRequest("/api/products/delete-multiple", "POST", { productIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
};

export const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productsData: InsertProduct[]) => {
      return apiRequest("/api/products/import", "POST", { products: productsData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
};

// Типизированные хуки для поставщиков
export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
};

export const useDeleteSuppliers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplierIds: number[]) => {
      return apiRequest("/api/suppliers/delete-multiple", "POST", { supplierIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
};

export const useImportSuppliers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suppliersData: InsertSupplier[]) => {
      return apiRequest("/api/suppliers/import", "POST", { suppliers: suppliersData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
};

// Типизированные хуки для контрагентов
export const useContractors = () => {
  return useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
  });
};

export const useDeleteContractors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractorIds: number[]) => {
      return apiRequest("/api/contractors/delete-multiple", "POST", { contractorIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
};

export const useImportContractors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractorsData: InsertContractor[]) => {
      return apiRequest("/api/contractors/import", "POST", { contractors: contractorsData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
    },
  });
};

// Типизированные хуки для документов
export const useDocuments = () => {
  return useQuery<DocumentRecord[]>({
    queryKey: ["/api/documents"],
  });
};

export const useDeleteDocuments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("/api/documents/delete-multiple", "POST", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });
};

// Типизированный хук для остатков
export const useInventory = () => {
  return useQuery<{ id: number; name: string; quantity: number }[]>({
    queryKey: ["/api/inventory"],
  });
};

let isCreatingDocument = false;
let lastDocumentRequest: any = null;

export const useCreateReceiptDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentData: any) => {
      // Защита от дублирования на уровне hook
      if (isCreatingDocument) {
        console.log('🚫 Блокирован повторный запрос в hook');
        throw new Error('Document creation already in progress');
      }
      
      // Проверяем, не такой ли же запрос недавно обрабатывался
      if (lastDocumentRequest && JSON.stringify(lastDocumentRequest) === JSON.stringify(documentData)) {
        console.log('🚫 Блокирован дублированный запрос');
        throw new Error('Duplicate request detected');
      }
      
      isCreatingDocument = true;
      lastDocumentRequest = { ...documentData };
      
      console.log('🔒 Блокировка активирована в hook');
      
      try {
        const result = await apiRequest("/api/documents/create-receipt", "POST", documentData);
        console.log('✅ Запрос успешно выполнен в hook');
        return result;
      } finally {
        setTimeout(() => {
          isCreatingDocument = false;
          lastDocumentRequest = null;
          console.log('🔓 Блокировка снята в hook');
        }, 1000); // Блокировка на 1 секунду
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });
};