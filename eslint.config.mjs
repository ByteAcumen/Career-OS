import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "old-dashboard.tsx",
    "refactor-dashboard.js",
    "restore.js",
    "delete-lines.py",
    "fix-layout.py",
    "recover.py",
    "refactor-sidebar.py",
    "refactor.py",
    "split_tabs.py",
    "check.js",
    "test.js",
  ]),
]);

export default eslintConfig;
