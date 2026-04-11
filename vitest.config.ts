import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Force Copenhagen timezone so getWeekStart timezone tests are deterministic
    env: { TZ: "Europe/Copenhagen" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
