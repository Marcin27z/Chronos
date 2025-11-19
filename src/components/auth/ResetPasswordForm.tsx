import * as React from "react";
import { useId } from "react";
import { z } from "zod";

import { AuthButton } from "./AuthButton";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";

const resetPasswordSchema = z
  .object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [form, setForm] = React.useState<ResetPasswordFormValues>({
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = React.useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const baseId = useId();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = React.useCallback(
    (field: keyof ResetPasswordFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setStatus(null);
    },
    []
  );

  const passwordHints = React.useMemo(() => {
    const requirements = [
      { label: "duża litera", met: /[A-Z]/.test(form.password) },
      { label: "mała litera", met: /[a-z]/.test(form.password) },
      { label: "cyfra", met: /[0-9]/.test(form.password) },
      { label: "min. 8 znaków", met: form.password.length >= 8 },
    ];

    return requirements.map((requirement) => `${requirement.met ? "✅" : "⚪"} ${requirement.label}`).join(" · ");
  }, [form.password]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = resetPasswordSchema.safeParse(form);
      if (!result.success) {
        setStatus({ type: "error", message: result.error.errors[0]?.message ?? "Sprawdź dane formularza" });
        return;
      }

      setIsLoading(true);
      setStatus({ type: "info", message: "Resetujemy hasło... (symulacja interfejsu)" });
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStatus({ type: "success", message: "Hasło zostało zaktualizowane. Możemy podłączyć backend." });
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
    <AuthCard title="Ustaw nowe hasło" description="Link resetujący hasło został już zweryfikowany">
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
          id={`${baseId}-reset-password`}
          label="Nowe hasło"
          type="password"
          value={form.password}
          onChange={handleChange("password")}
          helperText={passwordHints}
          placeholder="••••••••"
        />
        <AuthInput
          id={`${baseId}-reset-confirm`}
          label="Potwierdź nowe hasło"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange("confirmPassword")}
          placeholder="••••••••"
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Zmień hasło
        </AuthButton>
      </form>

      <p className="text-xs text-muted-foreground">
        Powrót do logowania?{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          Zaloguj się
        </a>
        .
      </p>
    </AuthCard>
  );
}
