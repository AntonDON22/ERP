import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/api";
import { useCreateShipment, useUpdateShipment, useDeleteShipment } from "@/hooks/api/useShipments";
import { useWarehouses, useOrders } from "@/hooks/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Product, Warehouse, Order, InsertShipment } from "@shared/schema";

// Схема для позиций отгрузки
const shipmentItemSchema = z.object({
  productId: z.coerce.number().min(1, "Выберите товар"),
  quantity: z.coerce.number().min(0.01, "Количество должно быть больше 0"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
});

// Схема для формы отгрузки
const shipmentSchema = z.object({
  orderId: z.number().min(1, "Выберите заказ"),
  warehouseId: z.number().min(1, "Выберите склад"),
  status: z.enum(["draft", "shipped"]).default("draft"),
  date: z.string().min(1, "Дата обязательна"),
  items: z.array(shipmentItemSchema).min(1, "Добавьте хотя бы один товар"),
});

// Типы данных существующей отгрузки
interface ExistingShipmentData {
  id: number;
  orderId: number;
  status: string;
  date: string;
  warehouseId: number | null;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
  }>;
}

// Конфигурация для типов отгрузок
export interface ShipmentTypeConfig {
  title: string;
  submitLabel: string;
  successMessage: string;
  backUrl: string;
  mutationHook: () => any;
}

type FormShipmentItem = z.infer<typeof shipmentItemSchema>;
type FormShipment = z.infer<typeof shipmentSchema>;

export interface ShipmentProps {
  config: ShipmentTypeConfig;
  shipmentData?: ExistingShipmentData;
}

export default function Shipment({ config, shipmentData }: ShipmentProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = config.mutationHook();
  const updateMutation = useUpdateShipment();
  const deleteMutation = useDeleteShipment();

  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const { data: orders = [] } = useOrders();

  // Состояние для статуса отгрузки
  const [shipmentStatus, setShipmentStatus] = useState(shipmentData?.status || "draft");

  // Счетчик и ref для предотвращения дублей
  const submissionCounter = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<FormShipment>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      orderId: shipmentData?.orderId ?? 84, // ID существующего заказа
      warehouseId: shipmentData?.warehouseId ?? 117, // ID существующего склада
      status: (shipmentData?.status as "draft" | "shipped") ?? "draft",
      date: shipmentData?.date ?? new Date().toISOString().split('T')[0],
      items: shipmentData?.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })) || [{ productId: 436, quantity: 1, price: 0 }], // ID существующего товара
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Функция для автоматического заполнения полей из заказа
  const fillFromOrder = (orderId: number) => {
    const selectedOrder = orders.find(order => order.id === orderId);
    if (selectedOrder) {
      // Заполняем склад (только если он есть)
      if (selectedOrder.warehouseId) {
        form.setValue("warehouseId", selectedOrder.warehouseId as number);
      }
      
      // Заполняем товары из позиций заказа
      if (selectedOrder.items && selectedOrder.items.length > 0) {
        // Очищаем текущие позиции
        fields.forEach((_, index) => remove(index));
        
        // Добавляем позиции из заказа
        selectedOrder.items.forEach(item => {
          append({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          });
        });
      }
    }
  };

  // Обновление формы при изменении shipmentData
  useEffect(() => {
    if (shipmentData) {
      const formData = {
        orderId: shipmentData.orderId ?? 84,
        warehouseId: shipmentData.warehouseId ?? 117,
        status: (shipmentData.status as "draft" | "shipped") ?? "draft",
        date: shipmentData.date ?? new Date().toISOString().split('T')[0],
        items: shipmentData.items?.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })) || [{ productId: 436, quantity: 1, price: 0 }],
      };
      
      form.reset(formData);
      setShipmentStatus(shipmentData.status || "draft");
    }
  }, [shipmentData, form]);

  // Функция удаления отгрузки
  const handleDelete = async () => {
    if (!shipmentData?.id) return;

    if (!confirm("Вы уверены, что хотите удалить эту отгрузку?")) {
      return;
    }

    try {
      // Используем универсальную мутацию без orderId
      await (deleteMutation as any).mutateAsync(shipmentData.id);
      toast({
        title: "Отгрузка удалена",
        description: "Отгрузка была успешно удалена",
      });
      setLocation(config.backUrl);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отгрузку",
        variant: "destructive",
      });
    }
  };

  // Обработчик сохранения
  const handleSave = async (data: FormShipment) => {
    const currentSubmissionId = ++submissionCounter.current;

    if (isSubmitting) {
      return;
    }

    if (mutation.isPending) {
      return;
    }

    if (currentSubmissionId !== submissionCounter.current) {
      return;
    }

    setIsSubmitting(true);

    try {
      const shipmentToSave: Partial<InsertShipment> = {
        orderId: data.orderId,
        status: shipmentStatus as "draft" | "shipped",
        date: data.date,
        warehouseId: data.warehouseId,
        comments: "",
        items: data.items.map((item: FormShipmentItem) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))
      };

      if (shipmentData?.id) {
        // Обновление существующей отгрузки
        await updateMutation.mutateAsync({
          id: shipmentData.id,
          data: shipmentToSave
        });
      } else {
        // Создание новой отгрузки
        await mutation.mutateAsync(shipmentToSave);
      }

      toast({
        title: "Успешно",
        description: config.successMessage,
      });
      setLocation(config.backUrl);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить отгрузку",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Добавление товара
  const addItem = () => {
    append({ productId: 1, quantity: 1, price: 0 });
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

  const statusOptions = [
    { value: "draft", label: "Черновик" },
    { value: "shipped", label: "Отгружено" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{config.title}</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setLocation(config.backUrl)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              {shipmentData?.id && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              )}
              <Button
                form="shipment-form"
                type="submit"
                disabled={isSubmitting || mutation.isPending}
              >
                {config.submitLabel}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Заказ</Label>
              <Select
                value={form.watch("orderId")?.toString() || "0"}
                onValueChange={(value) => {
                  const orderId = parseInt(value);
                  form.setValue("orderId", orderId);
                  fillFromOrder(orderId);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите заказ" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order: Order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Склад</Label>
              <Select
                value={form.watch("warehouseId")?.toString() || "0"}
                onValueChange={(value) => form.setValue("warehouseId", parseInt(value))}
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
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.warehouseId.message}</p>
              )}
            </div>
            <div>
              <Label>Статус</Label>
              <Select
                value={shipmentStatus}
                onValueChange={setShipmentStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Дата отгрузки</Label>
              <Input
                type="date"
                value={form.watch("date") || ""}
                onChange={(e) => form.setValue("date", e.target.value)}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <form id="shipment-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
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
                <Card key={field.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Товар</Label>
                      <Select
                        value={form.watch(`items.${index}.productId`)?.toString() || "0"}
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
                      {form.formState.errors.items?.[index]?.productId && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.items[index]?.productId?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Количество</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={form.watch(`items.${index}.quantity`) || ""}
                        onChange={(e) =>
                          form.setValue(`items.${index}.quantity`, parseFloat(e.target.value) || 0)
                        }
                      />
                      {form.formState.errors.items?.[index]?.quantity && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Цена</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.watch(`items.${index}.price`) || ""}
                        onChange={(e) =>
                          form.setValue(`items.${index}.price`, parseFloat(e.target.value) || 0)
                        }
                      />
                      {form.formState.errors.items?.[index]?.price && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.items[index]?.price?.message}
                        </p>
                      )}
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
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}