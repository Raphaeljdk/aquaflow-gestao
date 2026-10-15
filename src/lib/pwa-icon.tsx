import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Todas as dimensões são renderizadas a partir da imagem real fornecida pelo cliente.
// Não há captura de tela, botão de compartilhamento ou URL de hospedagem externa.
export function renderPwaIcon(size: number) {
  const image = readFileSync(join(process.cwd(), "public", "ducha-elitte-app.jpg"));
  const src = "data:image/jpeg;base64," + image.toString("base64");
  return new ImageResponse(
    <div style={{
      display: "flex", width: "100%", height: "100%",
      background: "#071734", alignItems: "center", justifyContent: "center",
    }}>
      {/* Sem bordas recortadas aqui: o sistema operacional faz o arredondamento. */}
      <img src={src} alt="Ducha Elitte" width={size} height={size}
        style={{ display: "block", width: size, height: size }} />
    </div>,
    { width: size, height: size },
  );
}
