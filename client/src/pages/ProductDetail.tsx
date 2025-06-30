import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatWeight, formatDimensions } from "@/lib/utils";
import type { Product } from "@shared/schema";

export default function ProductDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Успешно",
        description: "Товар был удален",
      });
      // Navigate back to products list
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить товар",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = async () => {
    if (product && confirm(`Вы уверены, что хотите удалить товар "${product.name}"?`)) {
      deleteProductMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Загрузка товара...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Товар не найден или произошла ошибка при загрузке.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Товары
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronLeft className="text-gray-400 mx-1 h-4 w-4 rotate-180" />
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {product.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <Card>
        <CardContent className="p-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Product Image */}
            <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-center object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="mt-8 lg:mt-0">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <div className="flex space-x-2">
                  <Link href={`/products/${product.id}/edit`}>
                    <Button className="inline-flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteProduct}
                    disabled={deleteProductMutation.isPending}
                    className="inline-flex items-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleteProductMutation.isPending ? "Удаление..." : "Удалить"}
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Артикул</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.sku}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Штрихкод</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.barcode || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Цена продажи</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {formatPrice(product.price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Цена закупки</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {formatPrice(product.purchasePrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Вес</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatWeight(product.weight)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Габариты</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDimensions(product.length, product.width, product.height)}
                    </dd>
                  </div>
                  {product.category && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Категория</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {product.category === "electronics" && "Электроника"}
                        {product.category === "clothing" && "Одежда"}
                        {product.category === "books" && "Книги"}
                        {product.category === "home" && "Дом и сад"}
                        {!["electronics", "clothing", "books", "home"].includes(product.category) && product.category}
                      </dd>
                    </div>
                  )}
                </div>

                {product.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Описание</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.description}</dd>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
