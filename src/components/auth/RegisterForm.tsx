import * as React from "react";
import { useId } from "react";
import { z } from "zod";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";

const registerSchema = z
  .object({
    email: z.string().email("Nieprawidłowy format adresu e-mail"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać przynajmniej jedną wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać przynajmniej jedną małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać przynajmniej jedną cyfrę"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [form, setForm] = React.useState<RegisterFormValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = React.useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const baseId = useId();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = React.useCallback(
    (field: keyof RegisterFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setStatus(null);
    },
    []
  );

  const password = form.password;
  const passwordFeedback = React.useMemo(() => {
    if (!password) {
      return "Hasło powinno zawierać co najmniej 8 znaków, jedną wielką literę, jedną małą literę i cyfrę.";
    }

    const checks = [
      { label: "duża litera", pattern: /[A-Z]/ },
      { label: "mała litera", pattern: /[a-z]/ },
      { label: "cyfra", pattern: /[0-9]/ },
      { label: "min. 8 znaków", pattern: /.{8,}/ },
    ];

    const passed = checks.filter((check) => check.pattern.test(password));
    if (passed.length === checks.length) {
      return undefined;
    }

    return `Spełnione: ${passed.map((check) => check.label).join(", ") || "żadne"}.`;
  }, [password]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = registerSchema.safeParse(form);
      if (!result.success) {
        setStatus({ type: "error", message: result.error.errors[0]?.message ?? "Sprawdź dane formularza" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Tworzymy konto... (symulacja UI)" });
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStatus({ type: "success", message: "Gotowe! Możemy podłączyć backend w kolejnym kroku." });
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
    <AuthCard title="Zarejestruj się" description="Utwórz konto aby zacząć planować">
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
          id={`${baseId}-register-email`}
          label="Adres e-mail"
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          placeholder="name@example.com"
        />
        <AuthInput
          id={`${baseId}-register-password`}
          label="Hasło"
          type="password"
          value={form.password}
          onChange={handleChange("password")}
          helperText={passwordFeedback || undefined}
          placeholder="••••••••"
        />
        <AuthInput
          id={`${baseId}-register-confirm`}
          label="Potwierdź hasło"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange("confirmPassword")}
          placeholder="••••••••"
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Zarejestruj konto
        </AuthButton>
      </form>

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
