import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "src/generated/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
