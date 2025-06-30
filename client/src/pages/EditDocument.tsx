import { useParams } from "wouter";
import Document, { DocumentTypeConfig } from "@/components/Document";
import { useCreateReceiptDocument } from "@/hooks/useTypedQuery";

const editConfig: DocumentTypeConfig = {
  title: "Редактирование документа",
  type: "Оприходование",
  namePrefix: "Оприходование",
  submitLabel: "Сохранить изменения",
  successMessage: "Документ успешно сохранен",
  backUrl: "/documents",
  mutationHook: useCreateReceiptDocument
};

export default function EditDocument() {
  const { id } = useParams();
  
  // TODO: Добавить загрузку документа по ID из базы данных
  const documentData = {
    id: Number(id),
    name: "Оприходование от 30.06.2025 21:37",
    type: "Оприходование",
    date: "2025-06-30",
    items: [
      { id: 1, productId: 6, quantity: 4, price: 1 }
    ]
  };

  return (
    <Document 
      config={editConfig}
      mode="edit"
      documentData={documentData}
    />
  );
}