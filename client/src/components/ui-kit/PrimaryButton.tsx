import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export function PrimaryButton({
  children,
  loading = false,
  loadingText = "Загрузка...",
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button className={cn("min-w-[100px]", className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  );
}
