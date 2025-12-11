import * as React from "react";
import { useId } from "react";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";
import { loginSchema, type LoginFormData } from "../../lib/utils/auth.validation";

export interface LoginFormStatus {
  type: "error" | "success" | "info";
  message: string;
}

interface LoginFormProps {
  initialStatus?: LoginFormStatus;
}

export function LoginForm({ initialStatus }: LoginFormProps) {
  const [form, setForm] = React.useState<LoginFormData>({ email: "", password: "" });
  const [status, setStatus] = React.useState<LoginFormStatus | null>(initialStatus ?? null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTouched, setIsTouched] = React.useState(false);
  const baseId = useId();

  React.useEffect(() => {
    setStatus(initialStatus ?? null);
  }, [initialStatus]);

  const handleChange = React.useCallback(
    (field: keyof LoginFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setIsTouched(true);
      setStatus(null);
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validation = loginSchema.safeParse(form);
      if (!validation.success) {
        setStatus({ type: "error", message: validation.error.errors[0]?.message ?? "Sprawdź pola formularza" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Łączenie z serwerem..." });

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setStatus({
            type: "error",
            message: payload?.error ?? "Wystąpił błąd. Spróbuj ponownie",
          });
          return;
        }

        setStatus({ type: "success", message: "Logowanie powiodło się. Przekierowuję..." });
        window.location.assign(payload?.redirectTo ?? "/");
      } catch {
        setStatus({ type: "error", message: "Wystąpił błąd. Spróbuj ponownie" });
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

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
          data-testid="login-status"
        >
          {status.message}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate data-testid="login-form">
        <AuthInput
          id={`${baseId}-email`}
          label="Adres e-mail"
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          error={isTouched && form.email === "" ? "E-mail jest wymagany" : undefined}
          placeholder="name@example.com"
          data-testid="login-email-input"
        />
        <AuthInput
          id={`${baseId}-password`}
          label="Hasło"
          type="password"
          value={form.password}
          onChange={handleChange("password")}
          error={isTouched && form.password === "" ? "Hasło jest wymagane" : undefined}
          placeholder="••••••••"
          data-testid="login-password-input"
        />

        <AuthButton type="submit" isLoading={isLoading} data-testid="login-submit">
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
