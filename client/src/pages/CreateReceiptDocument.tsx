import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useProducts, useCreateReceiptDocument } from "@/hooks/useTypedQuery";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { documentItemSchema, receiptDocumentSchema } from "@shared/schema";

// Модифицированная схема для формы (с строковыми значениями)
const formDocumentItemSchema = z.object({
  productId: z.number().min(1, "Выберите товар"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Количество должно быть больше 0"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Цена должна быть больше или равна 0"),
});

const formReceiptDocumentSchema = z.object({
  items: z.array(formDocumentItemSchema).min(1, "Добавьте хотя бы одну позицию"),
});

type FormDocumentItem = z.infer<typeof formDocumentItemSchema>;
type FormReceiptDocument = z.infer<typeof formReceiptDocumentSchema>;

export default function Document() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const createReceiptMutation = useCreateReceiptDocument();
  
  const [items, setItems] = useState<FormDocumentItem[]>([
    { productId: 0, quantity: "", price: "" }
  ]);

  const form = useForm<FormReceiptDocument>({
    resolver: zodResolver(formReceiptDocumentSchema),
    defaultValues: {
      items: items,
    },
  });

  // Добавить новую позицию
  const addItem = () => {
    const newItems = [...items, { productId: 0, quantity: "", price: "" }];
    setItems(newItems);
    form.setValue("items", newItems);
  };

  // Удалить позицию
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue("items", newItems);
    }
  };

  // Обновить позицию
  const updateItem = (index: number, field: keyof FormDocumentItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    form.setValue("items", newItems);
  };

  // Генерация названия документа
  const generateDocumentName = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ru-RU');
    const timeStr = today.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `Оприходование от ${dateStr} ${timeStr}`;
  };

  // Отправка формы
  const onSubmit = async (data: FormReceiptDocument) => {
    try {
      const documentName = generateDocumentName();
      
      const documentData = {
        name: documentName,
        date: new Date().toISOString().split('T')[0],
        items: data.items.map((item: FormDocumentItem) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price || "0"),
        })),
      };

      await createReceiptMutation.mutateAsync(documentData);

      toast({
        title: "Успешно",
        description: "Документ оприходования создан",
      });

      setLocation("/documents");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать документ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/documents")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Создание документа оприходования</h1>
        </div>

        {/* Форма */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Позиции документа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor={`product-${index}`}>Товар</Label>
                    <Select
                      value={item.productId.toString()}
                      onValueChange={(value) => updateItem(index, "productId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите товар" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Label htmlFor={`quantity-${index}`}>Количество</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="w-32">
                    <Label htmlFor={`price-${index}`}>Цена</Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="w-10">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить позицию
              </Button>
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex items-center gap-4">
            <Button type="submit" className="flex items-center gap-2">
              Создать документ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/documents")}
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}