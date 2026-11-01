import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cortesuli — Probate el corte antes de cortarte",
    template: "%s · Cortesuli",
  },
  description:
    "Turnos online con IA para peluquerías y barberías: tus clientes se prueban el corte en su propia cara, lo ven desde todos los ángulos y reservan su turno.",
  applicationName: "Cortesuli",
};

export const viewport: Viewport = {
  themeColor: "#f7f8f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
