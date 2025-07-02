import { cn } from "@/lib/utils";

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableWrapper({ children, className }: ResponsiveTableWrapperProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto",
        "min-w-full",
        "rounded-md border border-gray-200",
        "bg-white shadow-sm",
        className
      )}
    >
      <div className="min-w-[640px] sm:min-w-[768px] md:min-w-full">{children}</div>
    </div>
  );
}

export default ResponsiveTableWrapper;
