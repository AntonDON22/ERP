import DataTable, { ColumnConfig } from "@/components/DataTable";
import { useOrders, useDeleteOrders } from "@/hooks/useTypedQuery";
import { Order } from "@shared/schema";
import { useLocation } from "wouter";

const columns: ColumnConfig<Order>[] = [
  { key: "name", label: "Название", width: "40%", sortable: true },
  { key: "status", label: "Статус", width: "20%", sortable: true },
  { 
    key: "totalAmount", 
    label: "Сумма", 
    width: "15%", 
    sortable: true,
    format: (value) => `${Number(value || 0).toFixed(2)} ₽`
  },
  { key: "date", label: "Дата", width: "25%", sortable: true },
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
    <div className="p-6">
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
    </div>
  );
}