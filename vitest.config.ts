import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
      reporter: ["text", "lcov"],
      include: ["src/lib/vendus/**/*.ts"],
      exclude: ["**/*.test.ts", "**/types.ts"],
    },
  },
});
