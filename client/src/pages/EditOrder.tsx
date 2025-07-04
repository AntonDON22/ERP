import { useParams } from "wouter";
import { 
  logFormOperation, 
  logBlockDuplicate, 
  logOperationSuccess, 
  logOperationError, 
  logValidationError 
} from "@/lib/clientLogger";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useProducts, useOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/api";
import { useWarehouses } from "@/hooks/api";
import { useContractors } from "@/hooks/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Product, Warehouse, Contractor, orderSchema } from "@shared/schema";

type FormOrderItem = z.infer<typeof orderSchema>["items"][0];
type FormOrder = z.infer<typeof orderSchema>;

export default function EditOrder() {
  const { id } = useParams();
  const orderId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: orderData, isLoading: isLoadingOrder } = useOrder(orderId);
  const updateMutation = useUpdateOrder();
  const deleteMutation = useDeleteOrder();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const { data: contractors = [] } = useContractors();

  // Состояние для статуса заказа и резерва
  const [orderStatus, setOrderStatus] = useState("Новый");
  const [isReserved, setIsReserved] = useState(false);

  // Счетчик и ref для предотвращения дублей
  const submissionCounter = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<FormOrder>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: 34, // ID существующего контрагента (обязательное поле)
      warehouseId: 33, // ID существующего склада
      status: "Новый",
      items: [{ productId: 6, quantity: 1, price: 0 }], // Используем ID существующего товара
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Обновление формы при изменении orderData
  useEffect(() => {
    if (orderData) {;
      
      // Заполняем форму данными из orderData (который теперь содержит items)
      form.reset({
        customerId: orderData.customerId ?? undefined,
        warehouseId: orderData.warehouseId ?? 33,
        status: (orderData.status as "Новый" | "В работе" | "Выполнен" | "Отменен") ?? "Новый",
        items: orderData.items?.map((item: any) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        })) || [{ productId: 6, quantity: 1, price: 0 }],
      });
      
      // Обновляем состояния
      setOrderStatus(orderData.status ?? "Новый");
      setIsReserved(orderData.isReserved ?? false);
    }
  }, [orderData, form]);



  // Обработчик сохранения
  // Функция удаления заказа  
  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот заказ?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(orderId);
      toast({
        title: "Заказ удален",
        description: "Заказ был успешно удален",
      });
      setLocation("/orders");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить заказ",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (data: FormOrder) => {
    const currentSubmissionId = ++submissionCounter.current;
    if (process.env.NODE_ENV === "development") {
      logFormOperation("EditOrder", `Starting order update #${currentSubmissionId}`);
      logValidationError("EditOrder", form.formState.errors);
      logFormOperation("EditOrder", "Form values", data);
    }

    // Тройная защита от дублирования
    if (isSubmitting) {;
      return;
    }

    if (updateMutation.isPending) {;
      return;
    }

    // Проверка последовательности ID
    if (currentSubmissionId !== submissionCounter.current) {
      logBlockDuplicate("EditOrder", currentSubmissionId, `not current (${submissionCounter.current})`);
      return;
    }

    setIsSubmitting(true);
    if (process.env.NODE_ENV === "development") {
      logFormOperation("EditOrder", `Processing order update #${currentSubmissionId}`);
    }

    try {
      const orderToUpdate = {
        status: orderStatus as "Новый" | "В работе" | "Выполнен" | "Отменен",
        customerId: data.customerId || undefined,
        warehouseId: data.warehouseId,
        isReserved,
        items: data.items.map((item: FormOrderItem) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      if (process.env.NODE_ENV === "development") {
        logFormOperation("EditOrder", `Updating order ${orderId}`);
      }
      await updateMutation.mutateAsync({ id: orderId, data: orderToUpdate });
      if (process.env.NODE_ENV === "development") {
        logOperationSuccess("EditOrder", `Update #${currentSubmissionId} completed`);
      }
      toast({
        title: "Заказ обновлен",
        description: "Заказ успешно обновлен",
      });
      setLocation("/orders");
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        logOperationError("EditOrder", `Update #${currentSubmissionId}`, error);
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить заказ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (process.env.NODE_ENV === "development") {
        logFormOperation("CreateOrder", `Released submission lock for #${currentSubmissionId}`);
      }
    }
  };

  const addItem = () => {
    append({ productId: 6, quantity: 1, price: 0 }); // Используем ID существующего товара
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Автозаполнение цены при выборе товара
  const handleProductChange = (index: number, productId: number) => {
    form.setValue(`items.${index}.productId`, productId);
    const product = products.find((p: Product) => p.id === productId);
    if (product && product.price) {
      form.setValue(`items.${index}.price`, parseFloat(product.price));
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">Загрузка заказа...</div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">Заказ не найден</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{orderData.name}</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setLocation("/orders")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
              <Button
                form="order-form"
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="orderStatus">Статус заказа</Label>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Новый">Новый</SelectItem>
                  <SelectItem value="В работе">В работе</SelectItem>
                  <SelectItem value="Выполнен">Выполнен</SelectItem>
                  <SelectItem value="Отменен">Отменен</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Склад</Label>
              <Select
                value={form.watch("warehouseId")?.toString() || ""}
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
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.warehouseId.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="isReserved"
                checked={isReserved}
                onCheckedChange={(checked) => setIsReserved(checked === true)}
              />
              <Label htmlFor="isReserved">Резерв</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
            <div>
              <Label>Контрагент</Label>
              <Select
                value={form.watch("customerId")?.toString() || ""}
                onValueChange={(value) => form.setValue("customerId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите контрагента" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((contractor: Contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id.toString()}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.customerId.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <form
        id="order-form"
        onSubmit={form.handleSubmit(handleSave, (errors) => {;
          toast({
            title: "Ошибка валидации",
            description: "Обязательно выберите контрагента, склад и добавьте товары",
            variant: "destructive",
          });
        })}
        className="space-y-6"
      >
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
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg"
                >
                  <div className="md:col-span-3">
                    <Label>Товар</Label>
                    <Select
                      value={form.watch(`items.${index}.productId`)?.toString() || ""}
                      onValueChange={(value) => handleProductChange(index, parseInt(value))}
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
                    <Label>Кол-во</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      {...form.register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label>Цена</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register(`items.${index}.price`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={fields.length === 1}
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
