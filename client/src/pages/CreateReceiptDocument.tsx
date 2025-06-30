import Document, { DocumentTypeConfig } from "@/components/Document";
import { useCreateReceiptDocument } from "@/hooks/useTypedQuery";

const receiptConfig: DocumentTypeConfig = {
  title: "Создание документа оприходования",
  type: "Оприходование",
  namePrefix: "Оприходование",
  submitLabel: "Создать документ",
  successMessage: "Документ оприходования успешно создан",
  backUrl: "/documents",
  mutationHook: useCreateReceiptDocument,
};

export default function CreateReceiptDocument() {
  return <Document config={receiptConfig} />;
}