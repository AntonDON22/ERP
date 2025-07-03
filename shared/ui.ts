/**
 * 🎨 АРХИТЕКТУРНАЯ ЗАЩИТА: Централизованные UI импорты
 *
 * КРИТИЧЕСКОЕ ПРАВИЛО: Все UI компоненты импортируются только отсюда.
 * Запрещено прямое импортирование из @/components/ui/*
 *
 * ❌ НЕ ДЕЛАТЬ:
 * import { Button } from "@/components/ui/button"
 * import { Input } from "@/components/ui/input"
 *
 * ✅ ПРАВИЛЬНО:
 * import { Button, Input } from "@shared/ui"
 */

// Базовые компоненты
export { Button } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Badge } from "@/components/ui/badge";

// Формы
export { Checkbox } from "@/components/ui/checkbox";
export { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Карточки и макет
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export { Separator } from "@/components/ui/separator";
export { ScrollArea } from "@/components/ui/scroll-area";

// Навигация
export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

// Диалоги и модальные окна
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Интерактивные элементы
export { Switch } from "@/components/ui/switch";
export { Slider } from "@/components/ui/slider";
export { Progress } from "@/components/ui/progress";
export { Toggle } from "@/components/ui/toggle";
export { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Показ информации
export { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Специализированные компоненты
export { Calendar } from "@/components/ui/calendar";
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
export { default as DataTable } from "@/components/DataTable";
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Расширенные компоненты
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
export { AspectRatio } from "@/components/ui/aspect-ratio";
export {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

// UI Kit компоненты (собственные)
export { PrimaryButton } from "@/components/ui-kit/PrimaryButton";
export { ErrorAlert } from "@/components/ui-kit/ErrorAlert";
export { CardWrapper } from "@/components/ui-kit/CardWrapper";
export { ResponsiveTableWrapper } from "@/components/ui-kit/ResponsiveTableWrapper";

// Хуки
export { useToast } from "@/hooks/use-toast";

/**
 * Типы для централизованного использования
 */
export type { ButtonProps } from "@/components/ui/button";

/**
 * Утилиты для UI
 */
export { cn } from "@/lib/utils";

/**
 * ПРАВИЛА АРХИТЕКТУРЫ:
 *
 * 1. Все новые UI компоненты добавляются сюда
 * 2. При создании custom компонента - добавить экспорт
 * 3. ESLint должен блокировать прямые импорты из @/components/ui/*
 * 4. При рефакторинге - заменить все прямые импорты на shared/ui
 */
