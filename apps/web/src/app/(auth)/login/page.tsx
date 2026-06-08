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
import { Greeting } from "@/components/shared/date-time";
import { useAuthStore } from "@/src/stores/auth-store";

function setSessionCookie(token: string) {
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);

    try {
      await login(data.email, data.password);
      const token = useAuthStore.getState().token;
      if (token) setSessionCookie(token);
      router.push("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <Greeting />
        <h2 className="font-sans text-xl font-bold tracking-tight">
          Iniciar sesión
        </h2>
        <p className="text-sm text-muted-foreground">
          Ingresá tus credenciales para continuar
        </p>
      </div>

      <div className="rounded-sm border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <FieldMessage>{errors.email.message}</FieldMessage>}
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                ¿Olvidaste?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <FieldMessage>{errors.password.message}</FieldMessage>
            )}
          </Field>

          {serverError && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-sm font-medium text-destructive">
                {serverError}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline hover:text-primary/80"
        >
          Registrate
        </Link>
      </p>
    </div>
  );
}
