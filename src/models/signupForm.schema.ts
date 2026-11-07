import { z } from "zod";

export const SignupFormSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 letras.",
  }),
  email: z
    .string({
      error: "Email is required.",
    })
    .min(3, {
      message: "Ingresá un email válido.",
    })
    .email("Please enter a valid email."),
  password: z
    .string({
      error: "Please enter your password.",
    })
    .min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
});
