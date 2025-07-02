import { cn } from "@/lib/utils";

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableWrapper({ children, className }: ResponsiveTableWrapperProps) {
  return (
    <div className={cn("w-full overflow-x-auto", "border rounded-md", "bg-background", className)}>
      {children}
    </div>
  );
}
