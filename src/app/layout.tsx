import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Ducha Elitte",
  description: "Ducha Elitte: gestão completa do atendimento, vistoria e entrega.",
  applicationName: "Ducha Elitte",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ducha Elitte",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/pwa-192.png?v=4", type: "image/png", sizes: "192x192" }],
    shortcut: "/pwa-192.png?v=4",
    apple: [{ url: "/apple-icon?v=4", sizes: "180x180" }],
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
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
