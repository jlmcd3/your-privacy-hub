import { defineConfig } from "vitest/config";
export default defineConfig({
  root: "/dev-server",
  test: { environment: "node", globals: true, include: ["tests/edge/**/*.test.ts"] },
});
