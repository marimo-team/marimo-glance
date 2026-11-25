import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// WxtVitest swaps `browser` for an in-memory fake and applies the same aliases
// and auto-imports as the extension build.
export default defineConfig({
  plugins: [WxtVitest()],
  test: { include: ["test/**/*.test.ts"] },
});
