import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "E-mail jest wymagany").email("Nieprawidłowy format adresu e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
