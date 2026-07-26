import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [".agents/**", "dist/**", "coverage/**", "vendor/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "no-console": "off",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
