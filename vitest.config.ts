import { defineConfig } from "vitest/config";

// Vitest is only for deep pure logic (ADR 0001); Learner behaviour is tested in e2e/.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
