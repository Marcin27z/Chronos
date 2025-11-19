import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full max-w-md rounded-3xl border border-border bg-card/50 p-8 shadow-xl shadow-black/5 backdrop-blur",
        className
      )}
    >
      <header className="mb-6 space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Chronos</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>

      <div className="space-y-6">{children}</div>
    </section>
  );
}
