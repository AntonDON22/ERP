import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useProducts, useUpdateDocument } from "@/hooks/useTypedQuery";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useToggleDocumentStatus } from "@/hooks/useDocumentStatus";
import { ArrowLeft, Plus, Trash2, FileCheck, FileX } from "lucide-react";
import { Product, Warehouse } from "@shared/schema";

// Конфигурация для типов документов
export interface DocumentTypeConfig {
  title: string;
  type: string;
  namePrefix: string;
  submitLabel: string;
  successMessage: string;
  backUrl: string;
  mutationHook: () => any;
}

// Данные существующего документа для редактирования
export interface ExistingDocumentData {
  id: number;
  name: string;
  type: string;
  date: string;
  status: 'draft' | 'posted';
  warehouseId?: number;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
  }>;
}

// Схема для элемента документа
const documentItemSchema = z.object({
  productId: z.number().min(1, "Выберите товар"),
  quantity: z.number().min(1, "Количество должно быть больше 0"), // Целые числа
  price: z.number().min(0, "Цена не может быть отрицательной"),
});

// Схема для формы документа
const documentSchema = z.object({
  warehouseId: z.number().min(1, "Выберите склад"),
  status: z.enum(['draft', 'posted']).default('draft'),
  items: z.array(documentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

type FormDocumentItem = z.infer<typeof documentItemSchema>;
type FormDocument = z.infer<typeof documentSchema>;

export interface DocumentProps {
  config: DocumentTypeConfig;
  documentData?: ExistingDocumentData;
}

export default function Document({ config, documentData }: DocumentProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = config.mutationHook();
  const updateMutation = useUpdateDocument();
  const toggleStatusMutation = useToggleDocumentStatus();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  
  // Состояние для типа документа
  const [documentType, setDocumentType] = useState(documentData?.type || config.type);

  // Счетчик и ref для предотвращения дублей
  const submissionCounter = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<FormDocument>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      warehouseId: documentData?.warehouseId ?? 0,
      status: documentData?.status ?? 'draft',
      items: documentData?.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })) || [{ productId: 0, quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Обновление формы при изменении documentData
  useEffect(() => {
    if (documentData) {
      form.reset({
        warehouseId: documentData.warehouseId ?? 0,
        status: documentData.status ?? 'draft',
        items: documentData.items?.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })) || [{ productId: 0, quantity: 1, price: 0 }],
      });
    }
  }, [documentData, form]);

  // Обработчик сохранения
  const handleSave = async (data: FormDocument) => {
    const currentSubmissionId = ++submissionCounter.current;
    console.log(`🚀 Starting submission #${currentSubmissionId}`);

    // Тройная защита от дублирования
    if (isSubmitting) {
      console.log(`❌ Blocked duplicate submission #${currentSubmissionId} - isSubmitting = true`);
      return;
    }

    if (mutation.isPending) {
      console.log(`❌ Blocked duplicate submission #${currentSubmissionId} - mutation pending`);
      return;
    }

    // Проверка последовательности ID
    if (currentSubmissionId !== submissionCounter.current) {
      console.log(`❌ Blocked submission #${currentSubmissionId} - not current (${submissionCounter.current})`);
      return;
    }

    setIsSubmitting(true);
    console.log(`✅ Processing submission #${currentSubmissionId}`);

    try {
      const documentToSave = {
        type: documentType,
        status: data.status,
        warehouseId: data.warehouseId,
        items: data.items.map((item: FormDocumentItem) => ({
          productId: item.productId,
          quantity: item.quantity.toString(),
          price: item.price.toString(),
        })),
      };

      if (documentData) {
        // Редактирование существующего документа
        console.log(`📝 Updating document #${documentData.id}`);
        await updateMutation.mutateAsync({
          id: documentData.id,
          data: {
            type: documentType,
            status: data.status,
            warehouseId: data.warehouseId,
            items: data.items.map((item: FormDocumentItem) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          }
        });
      } else {
        // Создание нового документа
        console.log(`📄 Creating new document`);
        await mutation.mutateAsync(documentToSave);
      }

      console.log(`✅ Submission #${currentSubmissionId} completed successfully`);
      toast({ title: config.successMessage });
      setLocation(config.backUrl);
    } catch (error) {
      console.error(`❌ Submission #${currentSubmissionId} failed:`, error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сохранить документ",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
      console.log(`🔓 Released submission lock for #${currentSubmissionId}`);
    }
  };

  // Добавление товара
  const addItem = () => {
    append({ productId: 0, quantity: 1, price: 0 });
  };

  // Удаление товара
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Обновление цены при выборе товара
  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (product && product.price) {
      form.setValue(`items.${index}.price`, parseFloat(product.price));
    }
  };

  // Переключение статуса документа
  const handleToggleStatus = () => {
    if (!documentData?.id) return;
    
    toggleStatusMutation.mutate(documentData.id, {
      onSuccess: () => {
        const newStatus = documentData.status === 'posted' ? 'черновик' : 'проведен';
        toast({
          title: "Статус изменен",
          description: `Документ ${newStatus}`,
        });
        // Перенаправляем на список документов для обновления данных
        setLocation(config.backUrl);
      },
      onError: (error) => {
        toast({
          title: "Ошибка",
          description: "Не удалось изменить статус документа",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Документ</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(config.backUrl)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              {documentData?.id && (
                <Button
                  variant={documentData.status === 'posted' ? 'destructive' : 'default'}
                  onClick={handleToggleStatus}
                  disabled={toggleStatusMutation.isPending}
                >
                  {documentData.status === 'posted' ? (
                    <>
                      <FileX className="h-4 w-4 mr-2" />
                      Отменить проведение
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Провести
                    </>
                  )}
                </Button>
              )}
              <Button 
                form="document-form"
                type="submit"
                disabled={isSubmitting || mutation.isPending}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="documentType">Тип документа</Label>
              <Select
                value={documentType}
                onValueChange={setDocumentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Оприходование">Оприходование</SelectItem>
                  <SelectItem value="Списание">Списание</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Склад</Label>
              <Select
                value={form.watch('warehouseId')?.toString() || ""}
                onValueChange={(value) => form.setValue('warehouseId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse: Warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.warehouseId.message}
                </p>
              )}
            </div>
            <div>
              <Label>Статус</Label>
              <Select
                value={form.watch('status') || 'draft'}
                onValueChange={(value: 'draft' | 'posted') => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Черновик</SelectItem>
                  <SelectItem value="posted">Проведен</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <form id="document-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-6">

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Товары</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field: any, index: number) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-3">
                    <Label>Товар</Label>
                    <Select
                      value={form.watch(`items.${index}.productId`)?.toString() || ""}
                      onValueChange={(value) => {
                        const productId = parseInt(value);
                        form.setValue(`items.${index}.productId`, productId);
                        handleProductChange(index, productId);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите товар" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Кол-во</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={fields.length === 1}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}