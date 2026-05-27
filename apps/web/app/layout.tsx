import type { Metadata } from "next";
import { PT_Sans, Merriweather } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans"
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Wisender Pro",
  description:
    "Plataforma omnicanal para tu equipo comercial — mensajería, CRM y automatizaciones."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${ptSans.variable} ${merriweather.variable} min-h-[100dvh] bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
