import { useMemo } from "react";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { useOrders, useDeleteOrders } from "@/hooks/api";
import { Order } from "@shared/schema";
import { useLocation } from "wouter";

const columns: ColumnConfig<Order>[] = [
  {
    key: "name",
    label: "Название",
    minWidth: 180,
    sortable: true,
    copyable: true,
    multiline: true,
  },
  { key: "status", label: "Статус", minWidth: 100, sortable: true, copyable: true },
  {
    key: "totalAmount",
    label: "Сумма",
    minWidth: 110,
    sortable: true,
    copyable: true,
    format: (value) => `${Number(value || 0).toFixed(2)} ₽`,
  },
  {
    key: "createdAt",
    label: "Дата и время создания",
    minWidth: 150,
    sortable: true,
    copyable: true,
    format: (value: unknown) => {
      if (!value || (typeof value === 'object' && !(value instanceof Date) && Object.keys(value).length === 0)) return "";
      const date = new Date(value as string | number | Date);
      return date.toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
  },
  {
    key: "updatedAt",
    label: "Дата и время изменения",
    minWidth: 150,
    sortable: true,
    copyable: true,
    format: (value: unknown) => {
      if (!value || (typeof value === 'object' && !(value instanceof Date) && Object.keys(value).length === 0)) return "—";
      const date = new Date(value as string | number | Date);
      return date.toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
  },
];

export default function OrdersList() {
  const { data: orders = [], isLoading } = useOrders();
  const deleteOrdersMutation = useDeleteOrders();
  const [, setLocation] = useLocation();

  const memoizedColumns = useMemo(() => columns, []);

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
      columns={memoizedColumns as ColumnConfig<unknown>[]}
      isLoading={isLoading}
      entityName="заказ"
      entityNamePlural="заказы"
      searchFields={["name", "status"]}
      onDelete={handleDelete}
      onRowClick={(item) => handleRowClick(item as Order)}
      onCreate={handleCreate}
    />
  );
}
