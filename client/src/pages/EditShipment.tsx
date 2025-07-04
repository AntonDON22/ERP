import { useParams } from "wouter";
import Shipment, { ShipmentTypeConfig } from "@/components/Shipment";
import { useUpdateShipment, useShipment } from "@/hooks/api/useShipments";
import type { ShipmentItem } from "@shared/schema";

const editConfig: ShipmentTypeConfig = {
  title: "Редактирование отгрузки",
  submitLabel: "Сохранить",
  successMessage: "Отгрузка успешно обновлена",
  backUrl: "/shipments",
  mutationHook: useUpdateShipment,
};

export default function EditShipment() {
  const { id } = useParams();
  const shipmentId = Number(id);

  // Используем новый хук без orderId
  const { data: shipment, isLoading, error } = useShipment(shipmentId);

  if (isLoading) {
    return <div className="p-6">Загрузка отгрузки...</div>;
  }

  if (error || !shipment) {
    return <div className="p-6">Ошибка загрузки отгрузки</div>;
  }

  // Адаптер для совместимости типов
  const adaptedShipment = {
    id: shipment.id,
    orderId: shipment.orderId ?? 1,
    status: String(shipment.status || "draft"),
    date: shipment.date || new Date().toISOString().split('T')[0],
    warehouseId: shipment.warehouseId ?? 117,
    items: "items" in shipment && Array.isArray(shipment.items) ? shipment.items.map((item: ShipmentItem) => ({
      id: item.id,
      productId: item.productId,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0)
    })) : []
  };

  return <Shipment config={editConfig} shipmentData={adaptedShipment} />;
}