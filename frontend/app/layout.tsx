import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import ConfirmProvider from '@/components/ConfirmProvider';
import { SettingsProvider } from '@/contexts/SettingsContext';
import StartupAnimation from '@/components/StartupAnimation';
import PushNotificationManager from '@/components/PushNotificationManager';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata: Metadata = {
  title: "UniSphere AI — Logiciel de Gestion Universitaire & Plateforme LMD",
  description: "Plateforme intelligente de gestion administrative, académique et financière pour les universités, instituts supérieurs et grandes écoles au Mali et en zone UEMOA.",
  keywords: [
    "logiciel de gestion universitaire",
    "plateforme de gestion académique",
    "gestion universitaire au Mali",
    "logiciel de gestion des universités",
    "gestion du système LMD",
    "gestion des étudiants",
    "digitalisation de l'enseignement supérieur",
    "gestion administrative et financière universitaire"
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UniSphere AI",
  },
};

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <StartupAnimation />
        <PushNotificationManager />
        <OfflineBanner />
        <SettingsProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}