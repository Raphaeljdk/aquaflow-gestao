import { cp, mkdir, rm, writeFile, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = process.cwd(),
  demo = path.join(root, ".sites-demo");
await rm(demo, { recursive: true, force: true });
await mkdir(demo, { recursive: true });
for (const name of ["src", "public"])
  await cp(path.join(root, name), path.join(demo, name), { recursive: true });
await rm(path.join(demo, "src/app/api"), { recursive: true, force: true });
await rm(path.join(demo, "src/proxy.ts"), { force: true });
await symlink(
  path.join(root, "node_modules"),
  path.join(demo, "node_modules"),
  "dir",
);
await cp(path.join(root, "tsconfig.json"), path.join(demo, "tsconfig.json"));
await cp(
  path.join(root, "postcss.config.mjs"),
  path.join(demo, "postcss.config.mjs"),
);
await writeFile(
  path.join(demo, "package.json"),
  JSON.stringify({ private: true, name: "aquaflow-demo", version: "1.0.0" }),
);
await writeFile(
  path.join(demo, "next.config.mjs"),
  'export default {output:"export",trailingSlash:true,poweredByHeader:false,images:{unoptimized:true},experimental:{cpus:2}};',
);
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  {
    cwd: demo,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_DEMO: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
await rm(path.join(root, "out"), { recursive: true, force: true });
await cp(path.join(demo, "out"), path.join(root, "out"), { recursive: true });
console.log(
  "Demonstração estática criada em out/. A aplicação PostgreSQL permanece em src/.",
);
