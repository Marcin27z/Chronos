import * as React from "react";
import { useId } from "react";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";
import { registerSchema, type RegisterFormData } from "../../lib/utils/auth.validation";

export interface RegisterFormStatus {
  type: "error" | "success" | "info";
  message: string;
}

const getInitialFormState = (): RegisterFormData => ({
  email: "",
  password: "",
  confirmPassword: "",
});

const passwordHints = [
  { label: "duża litera", pattern: /[A-Z]/ },
  { label: "mała litera", pattern: /[a-z]/ },
  { label: "cyfra", pattern: /[0-9]/ },
  { label: "min. 8 znaków", pattern: /.{8,}/ },
];

export function RegisterForm() {
  const [form, setForm] = React.useState<RegisterFormData>(() => getInitialFormState());
  const [status, setStatus] = React.useState<RegisterFormStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTouched, setIsTouched] = React.useState(false);
  const baseId = useId();

  const statusToneClass = React.useMemo(() => {
    if (status?.type === "error") {
      return "bg-destructive/10 text-destructive";
    }

    if (status?.type === "success") {
      return "bg-green-50 text-green-700";
    }

    return "bg-primary/10 text-primary";
  }, [status?.type]);

  const passwordFeedback = React.useMemo(() => {
    if (!form.password) {
      return "Hasło powinno zawierać co najmniej 8 znaków, jedną wielką literę, jedną małą literę i cyfrę.";
    }
    const passed = passwordHints.filter((hint) => hint.pattern.test(form.password));
    if (passed.length === passwordHints.length) {
      return undefined;
    }

    return `Spełnione: ${passed.map((hint) => hint.label).join(", ") || "żadne"}.`;
  }, [form.password]);

  const handleChange = React.useCallback(
    (field: keyof RegisterFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setIsTouched(true);
      setStatus(null);
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validation = registerSchema.safeParse(form);
      if (!validation.success) {
        setStatus({ type: "error", message: validation.error.errors[0]?.message ?? "Sprawdź dane formularza" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Łączenie z serwerem..." });

      try {
        const response = await fetch("/api/auth/register", {
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

        setStatus({
          type: "success",
          message:
            payload?.message ?? "Na adres e-mail wysłaliśmy link weryfikacyjny. Sprawdź swoją skrzynkę pocztową.",
        });
        setForm(getInitialFormState());
        setIsTouched(false);
      } catch {
        setStatus({ type: "error", message: "Wystąpił błąd. Spróbuj ponownie" });
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

  return (
    <AuthCard title="Zarejestruj się" description="Utwórz konto aby zacząć planować">
      {status && (
        <div className={`rounded-md px-4 py-3 text-sm ${statusToneClass}`} role="status">
          {status.message}
        </div>
      )}

      {status?.type === "success" ? (
        <div className="pt-6">
          <a
            className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/"
          >
            Przejdź do aplikacji
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            {"Link weryfikacyjny potwierdzi konto i automatycznie przekieruje Cię do aplikacji. " +
              "Jeśli już potwierdziłeś e-mail, użyj przycisku powyżej."}
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthInput
            id={`${baseId}-register-email`}
            label="Adres e-mail"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            error={isTouched && !form.email ? "E-mail jest wymagany" : undefined}
            placeholder="name@example.com"
          />
          <AuthInput
            id={`${baseId}-register-password`}
            label="Hasło"
            type="password"
            value={form.password}
            onChange={handleChange("password")}
            helperText={passwordFeedback || undefined}
            error={isTouched && !form.password ? "Hasło jest wymagane" : undefined}
            placeholder="••••••••"
          />
          <AuthInput
            id={`${baseId}-register-confirm`}
            label="Potwierdź hasło"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            error={isTouched && !form.confirmPassword ? "Potwierdź hasło" : undefined}
            placeholder="••••••••"
          />

          <AuthButton type="submit" isLoading={isLoading}>
            Zarejestruj konto
          </AuthButton>
        </form>
      )}

      <p className="text-xs text-muted-foreground">
        Masz konto w Chronos?{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          Zaloguj się
        </a>
        .
      </p>
    </AuthCard>
  );
}
