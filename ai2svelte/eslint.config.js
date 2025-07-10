export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": ["error", {
        "vars": "all",
        "args": "after-used",
        "caughtErrors": "all",
        "ignoreRestSiblings": false
      }]
    }
  }
];