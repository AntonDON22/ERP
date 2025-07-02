import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  variant?: "destructive" | "default";
}

export function ErrorAlert({
  title = "Ошибка",
  message,
  onClose,
  className,
  variant = "destructive",
}: ErrorAlertProps) {
  return (
    <Alert variant={variant} className={cn("relative", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="pr-8">
        <div className="font-medium">{title}</div>
        <div className="text-sm mt-1">{message}</div>
      </AlertDescription>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Alert>
  );
}
