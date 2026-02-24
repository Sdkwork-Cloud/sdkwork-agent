# Quality Control Guide

## Overview

This document defines quality control requirements for the monorepo migration process.

---

## 1. i18n Quality Control

### Requirements

- All user-visible text must be internationalized
- No hardcoded strings in components
- All locales must have complete translations

### i18n Checklist

```markdown
## i18n Checklist for [MODULE_NAME]

### Files to Check
- [ ] All .tsx files
- [ ] All .ts files (except types)

### Patterns to Avoid
- [ ] No hardcoded Chinese: "用户管理"
- [ ] No hardcoded English: "User Management"
- [ ] No inline text: `<div>Hello</div>`

### Patterns to Use
- [ ] Use t() function: `{t('user.title')}`
- [ ] Use Trans component for complex text
- [ ] Use formatMessage for attributes
```

### i18n Check Script

```bash
#!/bin/bash
# scripts/check-i18n.sh

echo "Checking for hardcoded strings..."

# Find Chinese characters outside locale files
CHINESE=$(grep -rn "[\u4e00-\u9fa5]" packages/ --include="*.tsx" --include="*.ts" | grep -v "locales" | grep -v "i18n" | grep -v ".d.ts")

if [ -n "$CHINESE" ]; then
  echo "❌ Found hardcoded Chinese strings:"
  echo "$CHINESE"
  exit 1
fi

echo "✅ No hardcoded strings found"
```

---

## 2. Naming Convention Control

### Package Naming

**Format**: `${package_prefix}-react-xxx`

**Examples**:
- ✅ `sdkwork-react-commons`
- ✅ `sdkwork-react-user`
- ✅ `sdkwork-react-dashboard`
- ❌ `commons` (missing prefix)
- ❌ `sdkwork-commons` (missing react)
- ❌ `sdkwork-react-User` (uppercase)

### Naming Check Script

```bash
#!/bin/bash
# scripts/check-naming.sh

echo "Checking package naming conventions..."

PACKAGES=$(ls packages/)

for pkg in $PACKAGES; do
  if [[ ! $pkg =~ ^sdkwork-react-[a-z-]+$ ]]; then
    echo "❌ Invalid package name: $pkg"
    echo "   Expected format: sdkwork-react-[name]"
    exit 1
  fi
done

echo "✅ All package names follow convention"
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `Button.tsx` |
| Hook | camelCase + use | `useAuth.ts` |
| Utility | camelCase | `formatDate.ts` |
| Type | PascalCase + .types | `user.types.ts` |
| Test | Same + .test | `Button.test.tsx` |
| Locale | kebab-case | `zh-CN.json` |

---

## 3. Test Coverage Control

### Requirements

| Package Type | Minimum Coverage |
|--------------|------------------|
| Core packages | 80% |
| Business modules | 70% |

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

### Coverage Check Script

```bash
#!/bin/bash
# scripts/check-coverage.sh

echo "Checking test coverage..."

cd packages/$1

npm test -- --coverage --reporter=json --outputFile=coverage.json

COVERAGE=$(cat coverage.json | jq '.coverageMap.total.lines')

if [ "$COVERAGE" -lt 70 ]; then
  echo "❌ Test coverage ($COVERAGE%) is below 70%"
  exit 1
fi

echo "✅ Test coverage: $COVERAGE%"
```

---

## 4. Build Quality Control

### Build Checklist

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build completes successfully
- [ ] Bundle size within limits
- [ ] Source maps generated

### Build Script

```bash
#!/bin/bash
# scripts/check-build.sh

echo "Running build checks..."

# TypeScript check
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found"
  exit 1
fi

# ESLint check
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint warnings found"
  exit 1
fi

# Build
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ All build checks passed"
```

---

## 5. Code Review Checklist

### Before Review

- [ ] Self-review completed
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Documentation updated

### Review Criteria

| Category | Criteria |
|----------|----------|
| **Correctness** | Code works as expected |
| **Readability** | Code is easy to understand |
| **Maintainability** | Code is easy to modify |
| **Performance** | No obvious performance issues |
| **Security** | No security vulnerabilities |
| **Testing** | Adequate test coverage |
| **Documentation** | Code is well documented |

### Review Template

```markdown
## Code Review: [MODULE_NAME]

### Summary
Brief description of changes

### Checklist
- [ ] Code follows project conventions
- [ ] No unnecessary complexity
- [ ] Error handling is appropriate
- [ ] No security issues
- [ ] Tests are adequate
- [ ] Documentation is clear

### Comments
1. [Line X] Comment here
2. [Line Y] Suggestion here

### Verdict
- [ ] Approve
- [ ] Request Changes
- [ ] Need Discussion
```

---

## 6. Daily Build & Test

### CI/CD Configuration

```yaml
# .github/workflows/daily-build.yml
name: Daily Build

on:
  schedule:
    - cron: '0 0 * * *'  # Run at midnight
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 7. Progress Report

### Daily Report Template

```markdown
## Migration Progress Report - [DATE]

### Summary
| Metric | Value |
|--------|-------|
| Total modules | X |
| Migrated | Y |
| In progress | Z |
| Remaining | W |
| Test coverage | XX% |

### Completed Today
- [x] Module A migration
- [x] Module B tests

### In Progress
- [ ] Module C (XX%)
  - Files: X/Y
  - Tests: X/Y

### Issues
| Issue | Severity | Status | Owner |
|-------|----------|--------|-------|
| Issue 1 | High | Open | @user |
| Issue 2 | Medium | Resolved | @user |

### Tomorrow's Plan
1. Complete Module C
2. Start Module D
3. Review Module A

### Metrics
| Package | Coverage | Build | Status |
|---------|----------|-------|--------|
| commons | 85% | ✅ | Ready |
| i18n | 82% | ✅ | Ready |
| core | 78% | ✅ | Ready |
| user | 72% | ✅ | Ready |
```

---

## 8. Quality Gates

### Pre-Merge Gate

```bash
#!/bin/bash
# scripts/quality-gate.sh

echo "Running quality gate checks..."

# 1. Lint
npm run lint || exit 1

# 2. Type check
npm run typecheck || exit 1

# 3. Test
npm test -- --coverage || exit 1

# 4. Build
npm run build || exit 1

# 5. i18n check
./scripts/check-i18n.sh || exit 1

# 6. Naming check
./scripts/check-naming.sh || exit 1

echo "✅ All quality gates passed"
```

### Quality Gate Requirements

| Check | Requirement |
|-------|-------------|
| ESLint | No errors |
| TypeScript | No errors |
| Tests | All pass |
| Coverage | >= 70% |
| Build | Success |
| i18n | 100% coverage |
| Naming | Follow convention |
