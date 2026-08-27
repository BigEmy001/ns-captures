import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Repository tooling runs under Node, not in the browser. Linted rather
    // than ignored — scripts/no-secrets.mjs is what stands between a key and
    // a commit, so it is worth catching mistakes in.
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    // One-off maintenance scripts run under Node, not in the browser, so the
    // browser globals config flags console and process in them.
    ignores: ["dist", "supabase/.temp/**", "*.cjs", "*.mjs", "*.js", "*.mts"],
  },
);
