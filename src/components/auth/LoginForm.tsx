import * as React from "react";
import { useId } from "react";
import { z } from "zod";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";

const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [form, setForm] = React.useState<LoginFormValues>({ email: "", password: "" });
  const [status, setStatus] = React.useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTouched, setIsTouched] = React.useState(false);
  const baseId = useId();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = React.useCallback(
    (field: keyof LoginFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setIsTouched(true);
      setStatus(null);
    },
    []
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = loginSchema.safeParse(form);
      if (!result.success) {
        setStatus({ type: "error", message: result.error.errors[0]?.message ?? "Sprawdź pola formularza" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Formularz gotowy do integracji z backendem." });
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStatus({ type: "success", message: "Dane zostały przygotowane do wysłania." });
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
    <AuthCard title="Zaloguj się" description="Wprowadź swoje dane żeby kontynuować">
      {status && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            status.type === "error"
              ? "bg-destructive/10 text-destructive"
              : status.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-primary/10 text-primary"
          }`}
          role="status"
        >
          {status.message}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthInput
          id={`${baseId}-email`}
          label="Adres e-mail"
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          error={isTouched && form.email === "" ? "E-mail jest wymagany" : undefined}
          placeholder="name@example.com"
        />
        <AuthInput
          id={`${baseId}-password`}
          label="Hasło"
          type="password"
          value={form.password}
          onChange={handleChange("password")}
          error={isTouched && form.password === "" ? "Hasło jest wymagane" : undefined}
          placeholder="••••••••"
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Zaloguj się
        </AuthButton>
      </form>

      <p className="text-xs text-muted-foreground">
        Nie masz konta?{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href="/register">
          Zarejestruj się tutaj.
        </a>
      </p>
      <p className="text-xs text-muted-foreground">
        Zapomniałeś hasła?{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href="/forgot-password">
          Odzyskaj dostęp.
        </a>
      </p>
    </AuthCard>
  );
}
