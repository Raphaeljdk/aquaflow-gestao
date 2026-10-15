import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Escudo azul centralizado enviado pelo proprietário, sem texto e sem controles de captura.
export function renderPwaIcon(size: number) {
  const image = readFileSync(join(process.cwd(), "public", "ducha-elitte-emblema.jpg"));
  const src = "data:image/jpeg;base64," + image.toString("base64");
  return new ImageResponse(
    <div style={{
      display: "flex", width: "100%", height: "100%",
      background: "#071734", alignItems: "center", justifyContent: "center",
    }}>
      <img src={src} alt="Ducha Elitte" width={size} height={size}
        style={{ display: "block", width: size, height: size }} />
    </div>,
    { width: size, height: size },
  );
}
