import DataTable, { ColumnConfig } from "@/components/DataTable";
import { useOrders, useDeleteOrders } from "@/hooks/useTypedQuery";
import { Order } from "@shared/schema";
import { useLocation } from "wouter";

const columns: ColumnConfig<Order>[] = [
  { key: "name", label: "Название", width: "25%", sortable: true, copyable: true, multiline: true },
  { key: "status", label: "Статус", width: "12%", sortable: true, copyable: true },
  { 
    key: "totalAmount", 
    label: "Сумма", 
    width: "13%", 
    sortable: true,
    copyable: true,
    format: (value) => `${Number(value || 0).toFixed(2)} ₽`
  },
  { 
    key: "createdAt", 
    label: "Дата и время создания", 
    width: "25%", 
    sortable: true, 
    copyable: true,
    format: (value: any) => {
      if (!value) return '';
      const date = new Date(value);
      return date.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  },
  { 
    key: "updatedAt", 
    label: "Дата и время изменения", 
    width: "25%", 
    sortable: true, 
    copyable: true,
    format: (value: any) => {
      if (!value) return '—';
      const date = new Date(value);
      return date.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  },
];

export default function OrdersList() {
  const { data: orders = [], isLoading } = useOrders();
  const deleteOrdersMutation = useDeleteOrders();
  const [, setLocation] = useLocation();

  const handleDelete = async (ids: number[]) => {
    await deleteOrdersMutation.mutateAsync(ids);
  };

  const handleRowClick = (order: Order) => {
    setLocation(`/orders/${order.id}`);
  };

  const handleCreate = () => {
    setLocation("/orders/create");
  };

  return (
    <DataTable
      data={orders}
      columns={columns}
      isLoading={isLoading}
      entityName="заказ"
      entityNamePlural="заказы"
      searchFields={["name", "status"]}
      onDelete={handleDelete}
      onRowClick={handleRowClick}
      onCreate={handleCreate}
    />
  );
}