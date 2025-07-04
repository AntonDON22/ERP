import { useParams } from "wouter";
import Document, { DocumentTypeConfig } from "@/components/Document";
import { useUpdateDocument, useDocument } from "@/hooks/api";

const editConfig: DocumentTypeConfig = {
  title: "Документ",
  type: "income",
  namePrefix: "Оприходование",
  submitLabel: "Сохранить",
  successMessage: "Документ успешно сохранен",
  backUrl: "/documents",
  mutationHook: useUpdateDocument as any,
};

export default function EditDocument() {
  const { id } = useParams();
  const documentId = Number(id);

  const { data: document, isLoading, error } = useDocument(documentId);

  if (isLoading) {
    return <div className="p-6">Загрузка документа...</div>;
  }

  if (error || !document) {
    return <div className="p-6">Ошибка загрузки документа</div>;
  }

  // Адаптер для совместимости типов (null -> undefined)
  const adaptedDocument = {
    ...document,
    warehouseId: document.warehouseId ?? undefined,
  };

  return <Document config={editConfig} documentData={adaptedDocument} />;
}
