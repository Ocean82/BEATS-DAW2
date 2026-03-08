
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  { 
    ignores: ["server/dist/**", "server/venv/**", "dist/**", "node_modules/**"]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { 
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react": pluginReactConfig
    },
    rules: {
        "react/react-in-jsx-scope": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "react/prop-types": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  ...tseslint.configs.recommended,
];
