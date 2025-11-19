import * as React from "react";
import { useId } from "react";
import { z } from "zod";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";

const forgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu e-mail"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [form, setForm] = React.useState<ForgotPasswordFormValues>({ email: "" });
  const [status, setStatus] = React.useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const baseId = useId();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ email: event.target.value });
    setStatus(null);
  }, []);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = forgotPasswordSchema.safeParse(form);
      if (!result.success) {
        setStatus({ type: "error", message: result.error.errors[0]?.message ?? "Podaj poprawny e-mail" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Przygotowujemy link do resetu hasła..." });
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStatus({
          type: "success",
          message: "Jeśli konto istnieje, wysłaliśmy link resetujący hasło na wskazany adres.",
        });
      }, 600);
    },
    [form]
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AuthCard title="Odzyskaj dostęp" description="Podaj adres e-mail powiązany z kontem">
      {status && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            status.type === "error"
              ? "bg-destructive/10 text-destructive"
              : status.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-primary/10 text-primary"
          }`}
        >
          {status.message}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthInput
          id={`${baseId}-forgot-email`}
          label="Adres e-mail"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="name@example.com"
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Wyślij link do resetu
        </AuthButton>
      </form>

      <p className="text-xs text-muted-foreground">
        Pamiętasz dane logowania?{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          Zaloguj się
        </a>
        .
      </p>
    </AuthCard>
  );
}
