import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: string | number | null | undefined): string {
  if (!price) return "0 ₽";
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(numPrice)
    .replace("RUB", "₽");
}

export function formatWeight(weight: string | number | null | undefined): string {
  if (!weight) return "—";
  const numWeight = typeof weight === "string" ? parseFloat(weight) : weight;
  // Убираем .0 для целых чисел
  const formattedWeight = numWeight % 1 === 0 ? numWeight.toFixed(0) : numWeight.toString();
  return `${formattedWeight} г`;
}

export function formatDimensions(
  length: string | number | null | undefined,
  width: string | number | null | undefined,
  height: string | number | null | undefined
): string {
  if (!length && !width && !height) return "—";

  const l = length ? (typeof length === "string" ? parseFloat(length) : length) : 0;
  const w = width ? (typeof width === "string" ? parseFloat(width) : width) : 0;
  const h = height ? (typeof height === "string" ? parseFloat(height) : height) : 0;

  if (!l && !w && !h) return "—";

  // Убираем .0 для целых чисел
  const formatNumber = (num: number) => (num % 1 === 0 ? num.toFixed(0) : num.toString());

  return `${formatNumber(l || 0)}×${formatNumber(w || 0)}×${formatNumber(h || 0)} мм`;
}
