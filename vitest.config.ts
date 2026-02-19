import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"test"',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "src/__tests__/unit/**/*.test.ts",
            "src/__tests__/integration/**/*.test.ts",
            "src/__tests__/domain/**/*.test.ts",
            "src/__tests__/application/**/*.test.ts",
            "src/__tests__/security/**/*.test.ts",
            "src/lib/**/__tests__/**/*.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "happy-dom",
          include: [
            "src/__tests__/components/**/*.test.{ts,tsx}",
            "src/__tests__/presentation/**/*.test.{ts,tsx}",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "src/domain/**",
        "src/application/**",
        "src/lib/**",
        "src/components/**",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/__tests__/**",
        "src/types/**",
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
