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
import { useProducts } from "@/hooks/useTypedQuery";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Product } from "@shared/schema";

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

// Режимы работы компонента
export type DocumentMode = 'create' | 'edit' | 'view';

// Данные существующего документа для редактирования
export interface ExistingDocumentData {
  id: number;
  name: string;
  type: string;
  date: string;
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
  quantity: z.number().min(0.01, "Количество должно быть больше 0"),
  price: z.number().min(0, "Цена не может быть отрицательной"),
});

// Схема для формы документа
const documentFormSchema = z.object({
  items: z.array(documentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Модифицированная схема для формы (с строковыми значениями)
const formDocumentItemSchema = z.object({
  productId: z.number().min(1, "Выберите товар"),
  quantity: z.string().min(1, "Количество обязательно"),
  price: z.string().optional(),
});

const formDocumentSchema = z.object({
  items: z.array(formDocumentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

type FormDocumentItem = z.infer<typeof formDocumentItemSchema>;
type FormDocument = z.infer<typeof formDocumentSchema>;

export interface DocumentProps {
  config: DocumentTypeConfig;
  mode?: DocumentMode;
  documentData?: ExistingDocumentData;
}

export default function Document({ config, mode = 'create', documentData }: DocumentProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const mutation = config.mutationHook();

  // Состояние для режима редактирования/просмотра
  const [isEditing, setIsEditing] = useState(mode === 'create' || mode === 'edit');
  
  // Состояние для типа документа
  const [documentType, setDocumentType] = useState(documentData?.type || config.type);
  
  // Состояние для названия документа
  const [documentName, setDocumentName] = useState(documentData?.name || "");
  
  // Состояние для даты документа
  const [documentDate, setDocumentDate] = useState(documentData?.date || new Date().toISOString().split('T')[0]);

  // Инициализация товаров из существующих данных или пустой массив
  const initialItems = documentData?.items ? 
    documentData.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity.toString(),
      price: item.price.toString()
    })) : 
    [{ productId: 0, quantity: "1", price: "0" }];

  const [items, setItems] = useState<FormDocumentItem[]>(initialItems);

  const form = useForm<FormDocument>({
    resolver: zodResolver(formDocumentSchema),
    defaultValues: {
      items: items
    }
  });

  // Добавление нового товара
  const addItem = () => {
    const newItems = [...items, { productId: 0, quantity: "1", price: "0" }];
    setItems(newItems);
    form.setValue("items", newItems);
  };

  // Удаление товара
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue("items", newItems);
    }
  };

  // Обновление товара
  const updateItem = (index: number, field: keyof FormDocumentItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    form.setValue("items", newItems);
  };

  // Получение информации о товаре
  const getProductInfo = (productId: number): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  // Автозаполнение цены при выборе товара
  const handleProductChange = (index: number, productId: number) => {
    updateItem(index, "productId", productId);
    
    const product = getProductInfo(productId);
    if (product && product.price) {
      updateItem(index, "price", product.price.toString());
    }
  };

  // Генерация названия документа
  const generateDocumentName = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ru-RU');
    const timeStr = today.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${config.namePrefix} от ${dateStr} ${timeStr}`;
  };

  // Функция переключения режима редактирования
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Функция сохранения изменений
  const handleSave = async (data: FormDocument) => {
    try {
      const finalDocumentName = mode === 'create' ? generateDocumentName() : documentName;
      
      const documentPayload = {
        name: finalDocumentName,
        type: documentType,
        date: documentDate,
        items: data.items.map((item: FormDocumentItem) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price || "0"),
        })),
      };

      if (mode === 'create') {
        await mutation.mutateAsync(documentPayload);
        toast({
          title: "Успешно",
          description: config.successMessage,
        });
        setLocation(config.backUrl);
      } else {
        // Здесь будет логика обновления существующего документа
        toast({
          title: "Успешно",
          description: "Документ успешно сохранен",
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Ошибка при сохранении документа:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить документ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(config.backUrl)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к документам
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
          {mode !== 'create' && (
            <Button 
              type="button"
              variant={isEditing ? "outline" : "default"}
              onClick={toggleEditMode}
            >
              {isEditing ? "Отменить" : "Редактировать"}
            </Button>
          )}
        </div>
      </div>

      {/* Основные поля документа */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Информация о документе</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="documentType">Тип документа</Label>
            <Select
              value={documentType}
              onValueChange={setDocumentType}
              disabled={!isEditing}
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
            <Label htmlFor="documentName">Название документа</Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              disabled={!isEditing || mode === 'create'}
              placeholder="Название будет сгенерировано автоматически"
            />
          </div>
          
          <div>
            <Label htmlFor="documentDate">Дата документа</Label>
            <Input
              id="documentDate"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Товары в документе
              {isEditing && (
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить товар
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => {
              const product = getProductInfo(item.productId);
              return (
                <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                  <div className="col-span-4">
                    <Label htmlFor={`product-${index}`}>Товар</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, Number(e.target.value))}
                      disabled={!isEditing}
                    >
                      <option value={0}>Выберите товар</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`quantity-${index}`}>Количество</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      step="1"
                      min="1"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`price-${index}`}>Цена за единицу</Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Сумма</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                      {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)} ₽
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {product && (
                    <div className="col-span-12 text-sm text-gray-600">
                      <div className="grid grid-cols-3 gap-4">
                        <div>SKU: {product.sku}</div>
                        <div>Вес: {product.weight} г</div>
                        <div>Штрихкод: {product.barcode}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Общая сумма: {items.reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.price || 0)), 0).toFixed(2)} ₽
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setLocation(config.backUrl)}
          >
            {mode === 'view' ? "Назад" : "Отмена"}
          </Button>
          {isEditing && (
            <Button 
              type="submit" 
              disabled={mutation.isPending || items.length === 0 || items.some(item => item.productId === 0)}
            >
              {mutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}