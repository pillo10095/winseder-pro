"use client";

import { RegisterForm } from "@/src/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-sans text-xl font-bold">Crear cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completa los datos para registrar tu equipo
        </p>
      </div>

      <RegisterForm />
    </div>
  );
}
