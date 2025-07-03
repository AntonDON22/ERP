import CreateEntityForm, { FormField } from "@/components/CreateEntityForm";
import { useCreateWarehouse } from "@/hooks/api";

const warehouseFields: FormField[] = [
  {
    name: "name",
    label: "Название",
    type: "text",
    required: true,
    placeholder: "Введите название склада",
  },
  {
    name: "address",
    label: "Адрес",
    type: "textarea",
    required: false,
    placeholder: "Введите адрес склада",
  },
];

export default function CreateWarehouse() {
  const createWarehouseMutation = useCreateWarehouse();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await createWarehouseMutation.mutateAsync(data as { name: string; address?: string });
  };

  return (
    <CreateEntityForm
      title="Создать склад"
      description="Добавьте новый склад в систему"
      fields={warehouseFields}
      onSubmit={handleSubmit}
      cancelPath="/warehouses"
      isLoading={createWarehouseMutation.isPending}
    />
  );
}
