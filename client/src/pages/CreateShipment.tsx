import Shipment, { ShipmentTypeConfig } from "@/components/Shipment";
import { useCreateShipment } from "@/hooks/api/useShipments";

const createConfig: ShipmentTypeConfig = {
  title: "Новая отгрузка",
  submitLabel: "Создать",
  successMessage: "Отгрузка успешно создана",
  backUrl: "/shipments",
  mutationHook: useCreateShipment,
};

export default function CreateShipment() {
  return <Shipment config={createConfig} />;
}