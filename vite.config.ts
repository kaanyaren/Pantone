import { execSync } from "node:child_process";
import { defineConfig } from "vite";

function buildHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

export default defineConfig({
  base: "./",
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash()),
  },
  build: {
    target: "es2022",
  },
});
