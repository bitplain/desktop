import type { Metadata } from "next";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import SettingsProvider from "@/components/desktop/SettingsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desktop",
  description: "XP-style desktop shell",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="app-body">
        <ClientErrorReporter />
        <ClientErrorBoundary>
          <SettingsProvider>{children}</SettingsProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
