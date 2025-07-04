import CreateEntityForm, { FormField } from "@/components/CreateEntityForm";
import { useCreateSupplier } from "@/hooks/api";

const supplierFields: FormField[] = [
  {
    name: "name",
    label: "Название",
    type: "text",
    required: true,
    placeholder: "Введите название поставщика",
  },
  {
    name: "website",
    label: "Вебсайт",
    type: "url",
    required: false,
    placeholder: "https://example.com",
  },
];

export default function CreateSupplier() {
  const createSupplierMutation = useCreateSupplier();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await createSupplierMutation.mutateAsync(data as { name: string; website?: string });
  };

  return (
    <CreateEntityForm
      title="Создать поставщика"
      description="Добавьте нового поставщика в систему"
      fields={supplierFields}
      onSubmit={handleSubmit}
      cancelPath="/suppliers"
      isLoading={createSupplierMutation.isPending}
    />
  );
}
