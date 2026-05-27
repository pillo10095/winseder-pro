## Testing Capabilities

**Strict TDD Mode**: enabled
**Detected**: 2026-05-25

### Test Runner

- Command: turbo test
- Framework: TurboRepo (Jest for API)

### Test Layers

| Layer       | Available | Tool        |
| ----------- | --------- | ----------- |
| Unit        | ✅       | Jest        |
| Integration | ✅       | NestJS Testing utilities |
| E2E         | ❌       | —           |

### Coverage

- Available: ✅
- Command: turbo test -- --coverage

### Quality Tools

| Tool         | Available | Command        |
| ------------ | --------- | -------------- |
| Linter       | ✅       | turbo lint     |
| Type checker | ✅       | tsc --noEmit   |
| Formatter    | ✅       | prettier --write "**/*.{ts,tsx,js,jsx,json,md}" |