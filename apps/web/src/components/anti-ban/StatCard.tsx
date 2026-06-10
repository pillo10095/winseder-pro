"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatVariant = "default" | "success" | "warning" | "danger" | "paused";

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: StatVariant;
  size?: "lg" | "md";
}

const variantStyles: Record<StatVariant, { border: string; title: string; value: string }> = {
  default: { border: "", title: "text-muted-foreground", value: "" },
  success: {
    border: "border-success/30",
    title: "text-success",
    value: "text-success",
  },
  warning: {
    border: "border-warning/30",
    title: "text-warning",
    value: "text-warning",
  },
  danger: {
    border: "border-destructive/30",
    title: "text-destructive",
    value: "text-destructive",
  },
  paused: {
    border: "border-destructive/30",
    title: "text-muted-foreground",
    value: "text-destructive",
  },
};

export function StatCard({ title, value, variant = "default", size = "lg" }: StatCardProps) {
  const styles = variantStyles[variant];
  const valueClass =
    size === "lg"
      ? "font-sans text-3xl font-bold tracking-tight"
      : "font-sans text-2xl font-bold tracking-tight";

  return (
    <Card className={styles.border}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium ${styles.title}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`${valueClass} ${styles.value || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
