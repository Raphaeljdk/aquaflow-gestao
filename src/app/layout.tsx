import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Ducha Elitte · Gestão de lava-rápido", template: "%s | Ducha Elitte" },
  description: "Gerencie comandas, lavagens, agendamentos e a operação do seu lava-rápido em um só lugar.",
  applicationName: "Ducha Elitte",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ducha Elitte",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/pwa-192.png?v=2", type: "image/png", sizes: "192x192" }],
    shortcut: "/pwa-192.png?v=2",
    apple: [{ url: "/apple-icon?v=2", sizes: "180x180" }],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071734",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
