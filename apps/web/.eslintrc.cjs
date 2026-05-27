module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  parserOptions: {
    project: "./tsconfig.json"
  },
  settings: {
    next: {
      rootDir: ["./"]
    }
  }
};
