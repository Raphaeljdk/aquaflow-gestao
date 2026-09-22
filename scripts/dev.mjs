import { spawn } from "node:child_process";
import path from "node:path";
const args = process.argv.slice(2);
const preview = args.includes("--strictPort") && args.includes("--host");
const bin = path.resolve(
  preview ? "node_modules/vite/bin/vite.js" : "node_modules/next/dist/bin/next",
);
const child = spawn(
  process.execPath,
  [bin, ...(preview ? args : ["dev", "--hostname", "0.0.0.0", ...args])],
  { stdio: "inherit", env: process.env },
);
child.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
