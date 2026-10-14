import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AquaFlow | Gestão de Lava-Rápido",
    short_name: "AquaFlow",
    description: "Atendimentos, comandas, agendamentos e gestão do seu lava-rápido.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#081321",
    theme_color: "#081321",
    lang: "pt-BR",
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [
      { name: "Comandas", short_name: "Comandas", url: "/comandas" },
      { name: "Agendamentos", short_name: "Agenda", url: "/agendamentos" },
    ],
  };
}
