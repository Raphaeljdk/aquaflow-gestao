import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ducha Elitte | Gestão do Lava-Rápido",
    short_name: "Ducha Elitte",
    description: "Atendimentos, comandas e agendamentos do lava-rápido.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#071734",
    theme_color: "#071734",
    lang: "pt-BR",
    icons: [
      { src: "/pwa-192.png?v=4", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png?v=4", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png?v=4", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Comandas", short_name: "Comandas", url: "/comandas" },
      { name: "Agendamentos", short_name: "Agenda", url: "/agendamentos" },
    ],
  };
}
