import CreateEntityForm, { FormField } from "@/components/CreateEntityForm";
import { useCreateContractor } from "@/hooks/api";

const contractorFields: FormField[] = [
  {
    name: "name",
    label: "Название",
    type: "text",
    required: true,
    placeholder: "Введите название контрагента",
  },
  {
    name: "website",
    label: "Вебсайт",
    type: "url",
    required: false,
    placeholder: "https://example.com",
  },
];

export default function CreateContractor() {
  const createContractorMutation = useCreateContractor();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await createContractorMutation.mutateAsync(data as { name: string; website?: string });
  };

  return (
    <CreateEntityForm
      title="Создать контрагента"
      description="Добавьте нового контрагента в систему"
      fields={contractorFields}
      onSubmit={handleSubmit}
      cancelPath="/contractors"
      isLoading={createContractorMutation.isPending}
    />
  );
}
