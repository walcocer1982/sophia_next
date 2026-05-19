import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev/maintenance utilities — not shipped app code, not linted with app rules.
    "scripts/**",
  ]),
  {
    rules: {
      // React Compiler diagnostics (eslint-plugin-react-hooks v6, pulled in by
      // an eslint-config-next bump). Flag functionally-correct legacy patterns
      // (lazy ref reads, setState-in-effect) in central planner state hooks.
      // Refactoring those now is higher risk than the warnings are worth, so
      // they stay visible as warnings instead of blocking the lint gate.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
