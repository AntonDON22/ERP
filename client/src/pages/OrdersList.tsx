import DataTable, { ColumnConfig } from "@/components/DataTable";
import { useOrders, useDeleteOrders } from "@/hooks/useTypedQuery";
import { Order } from "@shared/schema";
import { useLocation } from "wouter";

const columns: ColumnConfig<Order>[] = [
  { key: "name", label: "Название", width: "35%", sortable: true, copyable: true, multiline: true },
  { key: "status", label: "Статус", width: "15%", sortable: true, copyable: true },
  { 
    key: "totalAmount", 
    label: "Сумма", 
    width: "20%", 
    sortable: true,
    copyable: true,
    format: (value) => `${Number(value || 0).toFixed(2)} ₽`
  },
  { key: "date", label: "Дата", width: "30%", sortable: true, copyable: true },
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