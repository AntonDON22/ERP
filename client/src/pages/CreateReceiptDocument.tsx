import Document, { DocumentTypeConfig } from "@/components/Document";
import { useCreateReceiptDocument } from "@/hooks/useTypedQuery";

const receiptConfig: DocumentTypeConfig = {
  title: "Документ",
  type: "Оприходование",
  namePrefix: "Оприходование",
  submitLabel: "Сохранить",
  successMessage: "Документ оприходования успешно создан",
  backUrl: "/documents",
  mutationHook: useCreateReceiptDocument,
};

export default function CreateReceiptDocument() {
  return <Document config={receiptConfig} />;
}