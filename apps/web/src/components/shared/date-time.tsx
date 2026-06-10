"use client";

import { useEffect, useState } from "react";

const DAYS = [
  "domingo", "lunes", "martes", "miércoles", "jueves",
  "viernes", "sábado",
];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDate(date: Date) {
  const day = DAYS[date.getDay()];
  const num = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}, ${num} de ${month} de ${year}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function DateTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="block text-xs tabular-nums leading-relaxed text-muted-foreground/70" />
    );
  }

  return (
    <time
      dateTime={now.toISOString()}
      className="block text-xs tabular-nums leading-relaxed text-muted-foreground/70"
    >
      {formatDate(now)}
      <br />
      {formatTime(now)}
    </time>
  );
}

export function Greeting({ name }: { name?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <p className="text-sm text-muted-foreground" />;
  }

  const greeting = getGreeting(now);

  return (
    <p className="text-sm text-muted-foreground">
      {greeting}
      {name ? <>, <span className="font-medium text-foreground">{name}</span></> : null}
    </p>
  );
}
