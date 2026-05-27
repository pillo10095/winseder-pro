"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/src/stores/auth-store";

function setSessionCookie(token: string) {
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

const registerSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);

    try {
      await registerUser(data.name, data.email, data.password);
      const token = useAuthStore.getState().token;
      if (token) setSessionCookie(token);
      router.push("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" type="text" placeholder="Tu nombre" {...register("name")} />
        {errors.name && <FieldMessage>{errors.name.message}</FieldMessage>}
      </Field>

      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="tu@email.com" {...register("email")} />
        {errors.email && <FieldMessage>{errors.email.message}</FieldMessage>}
      </Field>

      <Field>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && <FieldMessage>{errors.password.message}</FieldMessage>}
      </Field>

      <Field>
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <FieldMessage>{errors.confirmPassword.message}</FieldMessage>
        )}
      </Field>

      {serverError && (
        <p className="text-sm font-medium text-destructive">{serverError}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
