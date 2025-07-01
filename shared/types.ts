// Дополнительные типы для улучшения типизации в хуках и компонентах

import { Order, OrderItem, DocumentRecord, DocumentItem } from "./schema";

// Полные типы для заказов
export interface OrderWithItems extends Order {
  items: OrderItem[];
  customerName?: string;
  warehouseName?: string;
}

// Полные типы для документов
export interface DocumentWithItems extends DocumentRecord {
  items: DocumentItem[];
  warehouseName?: string;
}

// Данные для создания заказа
export interface CreateOrderData {
  customerId: number;
  warehouseId: number;
  notes?: string;
  isReserved: boolean;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
}

// Данные для создания документа
export interface CreateDocumentData {
  type: 'Оприходование' | 'Списание';
  warehouseId: number;
  status: 'draft' | 'posted';
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
}

// Данные для обновления заказа/документа
export interface UpdateOrderData {
  id: number;
  data: Partial<CreateOrderData>;
}

export interface UpdateDocumentData {
  id: number;
  data: Partial<CreateDocumentData>;
}

// Ответы API для инвентаря
export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
}

export interface InventoryAvailabilityItem extends InventoryItem {
  reserved: number;
  available: number;
}