import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function AuthButton({ isLoading, loadingText, children, className, variant, ...props }: AuthButtonProps) {
  return (
    <Button
      className={cn("w-full justify-center", className)}
      variant={variant}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {isLoading ? (loadingText ?? "Trwa przetwarzanie...") : children}
    </Button>
  );
}
