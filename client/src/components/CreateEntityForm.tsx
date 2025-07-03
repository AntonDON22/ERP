import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Типы полей для формы
export type FieldType = "text" | "textarea" | "email" | "url";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
}

export interface CreateEntityFormProps {
  title: string;
  description?: string;
  fields: FormField[];
  // ✅ ИСПРАВЛЕНО: Типизация вместо any для onSubmit
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  cancelPath: string;
  isLoading?: boolean;
}

// Создание динамической схемы валидации на основе полей
const createValidationSchema = (fields: FormField[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let validator: z.ZodTypeAny = z.string();

    if (field.required !== false) {
      validator = validator.min(1, `${field.label} обязательно для заполнения`);
    }

    if (field.type === "email") {
      validator = validator.email("Введите корректный email");
    }

    if (field.type === "url") {
      validator = validator.url("Введите корректный URL").or(z.literal(""));
    }

    schemaFields[field.name] = validator;
  });

  return z.object(schemaFields);
};

export default function CreateEntityForm({
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Создать",
  cancelPath,
  isLoading = false,
}: CreateEntityFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const schema = createValidationSchema(fields);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce(
      (acc, field) => {
        acc[field.name] = "";
        return acc;
      },
      {} as Record<string, string>
    ),
  });

  // ✅ ИСПРАВЛЕНО: Типизация вместо any для handleSubmit
  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      await onSubmit(data);
      toast({
        title: "Успешно",
        description: `${title} создан`,
      });
      navigate(cancelPath);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: `Не удалось создать ${title.toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const renderField = (field: FormField) => {
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              {field.type === "textarea" ? (
                <Textarea placeholder={field.placeholder} {...formField} />
              ) : (
                <Input
                  type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
                  placeholder={field.placeholder}
                  {...formField}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">{fields.map(renderField)}</div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Создание..." : submitLabel}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(cancelPath)}>
                  Отменить
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
