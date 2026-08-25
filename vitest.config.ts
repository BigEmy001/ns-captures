import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // The component tests wait on mocked promises to resolve and re-render.
    // The default one-second waitFor is comfortable on an idle machine and
    // marginal on a loaded one, which showed up as tests failing in the full
    // parallel run and passing in isolation. Headroom, not a fix for slowness.
    testTimeout: 15000,
    expect: { poll: { timeout: 5000 } },
  },
});
