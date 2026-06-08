import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { label: "Mensajes hoy", value: "--" },
  { label: "Contactos activos", value: "--" },
  { label: "Campañas activas", value: "--" },
  { label: "Sesiones WhatsApp", value: "--" }
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Panel de Control</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a Wisender Pro
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-sans text-3xl font-bold tracking-tight">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <hr className="divider-constructivist" />

      <section className="flex flex-col gap-4">
        <h2 className="font-sans text-lg font-bold">Actividad reciente</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 flex size-12 items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <span className="text-xs font-bold text-muted-foreground/50">{'//'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay actividad registrada todavía.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Los eventos aparecerán aquí automáticamente.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
