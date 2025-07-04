import { useMemo } from "react";
import DataTable from "@/components/DataTable";
import { useShipments, useDeleteShipment } from "@/hooks/api/useShipments";
import { useOrders, useWarehouses } from "@/hooks/api";
import { useLocation } from "wouter";

export default function ShipmentsList() {
  const [, setLocation] = useLocation();
  const { data: shipments = [], isLoading } = useShipments();
  const { data: orders = [] } = useOrders();
  const { data: warehouses = [] } = useWarehouses();
  const deleteShipmentMutation = useDeleteShipment();

  const columns = useMemo(() => [
    {
      key: "orderId",
      label: "Заказ",
      minWidth: 180,
      copyable: true,
      multiline: true,
      format: (value: any) => {
        if (!value) return "Не указан";
        const order = orders.find((o: any) => o.id === value);
        return order ? order.name : `Заказ #${value}`;
      },
    },
    {
      key: "status",
      label: "Статус",
      minWidth: 120,
      sortable: true,
      copyable: true,
      format: (value: any) => {
        const statusNames: Record<string, string> = {
          draft: "Черновик",
          prepared: "Подготовлено",
          shipped: "Отгружено",
          delivered: "Доставлено",
          cancelled: "Отменено",
        };
        return statusNames[value] || value;
      },
    },
    {
      key: "warehouseId",
      label: "Склад",
      minWidth: 140,
      copyable: true,
      format: (value: any) => {
        if (!value) return "Не указан";
        const warehouse = warehouses.find((w: any) => w.id === value);
        return warehouse ? warehouse.name : `Склад ${value}`;
      },
    },
    {
      key: "date",
      label: "Дата отгрузки",
      minWidth: 120,
      sortable: true,
      copyable: true,
      format: (value: unknown) => {
        if (!value) return "";
        const date = new Date(value as string | number | Date);
        return date.toLocaleDateString("ru-RU", {
          timeZone: "Europe/Moscow",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      },
    },
    {
      key: "comments",
      label: "Комментарии",
      minWidth: 200,
      copyable: true,
      multiline: true,
      format: (value: any) => value || "—",
    },
    {
      key: "createdAt",
      label: "Дата создания",
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
        });
      },
    },
  ], [orders, warehouses]);

  const handleEdit = (shipment: any) => {
    setLocation(`/shipments/${shipment.id}/edit`);
  };

  const handleDelete = async (selectedIds: number[]) => {
    for (const id of selectedIds) {
      await deleteShipmentMutation.mutateAsync(id);
    }
  };

  const handleCreate = () => {
    setLocation("/shipments/create");
  };

  return (
    <DataTable
      data={shipments}
      columns={columns}
      isLoading={isLoading}
      entityName="отгрузка"
      entityNamePlural="отгрузки"
      searchFields={["orderId", "status", "comments"]}
      onDelete={handleDelete}
      onRowClick={handleEdit}
      onCreate={handleCreate}
    />
  );
}