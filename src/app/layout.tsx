import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "AquaFlow · Gestão de lava-rápido", template: "%s | AquaFlow" },
  description: "Gerencie comandas, lavagens, agendamentos e a operação do seu lava-rápido em um só lugar.",
  applicationName: "AquaFlow",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AquaFlow",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/aquaflow-icon.svg", type: "image/svg+xml" }],
    shortcut: "/aquaflow-icon.svg",
    apple: [{ url: "/apple-icon", sizes: "180x180" }],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#081321",
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
