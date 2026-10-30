import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import ConfirmProvider from '@/components/ConfirmProvider';
import { SettingsProvider } from '@/contexts/SettingsContext';
import StartupAnimation from '@/components/StartupAnimation';

export const metadata: Metadata = {
  title: "UniSphere AI - Plateforme Universitaire Intelligente",
  description: "Plateforme universitaire unifiée pour étudiants, enseignants et administration",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniSphere AI",
  },
};

export const viewport = {
  themeColor: "#FF6B00",
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