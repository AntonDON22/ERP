import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table-wrapper";
import { Search, Settings, Download, Upload, Trash2, Plus } from "lucide-react";

const testData = [
  { id: 1, name: "Очень длинное название товара для тестирования переноса", sku: "SKU-001", price: 1299.99, category: "Электроника" },
  { id: 2, name: "Короткое название", sku: "SKU-002", price: 599.50, category: "Одежда" },
  { id: 3, name: "Средней длины название товара", sku: "SKU-003", price: 2499.00, category: "Мебель" },
];

export default function ResponsiveTest() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Заголовок */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Тестирование адаптивности
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Проверка корректного отображения компонентов на разных экранах
            </p>
          </div>

          {/* Секция 1: Формы и поля ввода */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Формы и поля ввода</CardTitle>
              <CardDescription>
                Проверка адаптивности форм на малых экранах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Название</label>
                  <Input placeholder="Введите название..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Категория</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Электроника</SelectItem>
                      <SelectItem value="clothing">Одежда</SelectItem>
                      <SelectItem value="furniture">Мебель</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Цена</label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button className="w-full sm:w-auto">Сохранить</Button>
                <Button variant="outline" className="w-full sm:w-auto">Отменить</Button>
              </div>
            </CardContent>
          </Card>

          {/* Секция 2: Панель управления */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Панель управления</CardTitle>
              <CardDescription>
                Панель с поиском, фильтрами и кнопками действий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Поиск товаров..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-48">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      <SelectItem value="electronics">Электроника</SelectItem>
                      <SelectItem value="clothing">Одежда</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" className="flex-1 sm:flex-none">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Создать</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Экспорт</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Импорт</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Секция 3: Адаптивная таблица */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Адаптивная таблица</CardTitle>
              <CardDescription>
                Таблица с горизонтальной прокруткой и responsive классами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveTableWrapper>
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-2 sm:px-4 py-3 text-left">
                        <Checkbox />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '300px' }}>
                        Название
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                        Артикул
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                        Цена
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>
                        Категория
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {testData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-3">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) {
                                newSelected.add(item.id);
                              } else {
                                newSelected.delete(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">
                          <span className="break-words">{item.name}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">
                          <span className="truncate block">{item.sku}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">
                          {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">
                          <span className="truncate block">{item.category}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableWrapper>
            </CardContent>
          </Card>

          {/* Секция 4: Модальные окна и поповеры */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Модальные окна и поповеры</CardTitle>
              <CardDescription>
                Тестирование адаптивности модальных компонентов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">Открыть модальное окно</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Тестовое модальное окно</DialogTitle>
                      <DialogDescription>
                        Проверка адаптивности модального окна на разных экранах.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <label className="text-right sm:text-left">Название</label>
                        <Input className="col-span-1 sm:col-span-3" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <label className="text-right sm:text-left">Описание</label>
                        <Input className="col-span-1 sm:col-span-3" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Отменить
                      </Button>
                      <Button onClick={() => setIsDialogOpen(false)}>
                        Сохранить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Settings className="w-4 h-4 mr-2" />
                      Настройки
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Настройки отображения</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="show-images" />
                          <label htmlFor="show-images" className="text-sm">
                            Показывать изображения
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="compact-mode" />
                          <label htmlFor="compact-mode" className="text-sm">
                            Компактный режим
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="auto-refresh" />
                          <label htmlFor="auto-refresh" className="text-sm">
                            Автообновление
                          </label>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Секция 5: Карточки и сетки */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Адаптивные карточки</CardTitle>
              <CardDescription>
                Сетка карточек с адаптивными breakpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {testData.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base line-clamp-2">
                        {item.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Артикул: {item.sku}
                        </p>
                        <p className="text-sm sm:text-base font-semibold">
                          {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="flex-1 text-xs sm:text-sm">
                            Редактировать
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Информация о тестировании */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl text-blue-900">
                Инструкции по тестированию
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              <div className="space-y-3 text-sm sm:text-base">
                <p>
                  <strong>Для тестирования адаптивности:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Откройте DevTools (F12) и переключитесь в режим устройства</li>
                  <li>Протестируйте ширины: 320px (iPhone SE), 375px (iPhone), 768px (iPad), 1024px+ (Desktop)</li>
                  <li>Проверьте горизонтальную прокрутку в таблицах</li>
                  <li>Убедитесь, что модальные окна корректно отображаются</li>
                  <li>Проверьте адаптивность кнопок и форм</li>
                </ul>
                <p className="pt-2">
                  <strong>Ожидаемое поведение:</strong> Нет горизонтальной прокрутки основной страницы, 
                  все элементы помещаются в viewport, таблицы имеют внутреннюю прокрутку.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}