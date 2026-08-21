import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
