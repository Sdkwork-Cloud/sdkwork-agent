# Monorepo Migration Guide

## Overview

This guide covers the systematic migration of React applications to a monorepo architecture with independent packages.

---

## Package Naming Convention

**Format**: `${package_prefix}-react-xxx`

Example: `sdkwork-react-commons`, `sdkwork-react-i18n`, `sdkwork-react-core`

---

## Phase 1: Preparation

### Step 1.1: Create Package Structure

```bash
# Create core packages
mkdir -p packages/sdkwork-react-commons/src/{components,utils,hooks,types}
mkdir -p packages/sdkwork-react-i18n/src/{provider,hooks,utils,locales,types}
mkdir -p packages/sdkwork-react-core/src/{router,store,providers,types}

# Create business packages (as needed)
mkdir -p packages/sdkwork-react-user/src/{pages,components,api,hooks,store,types}
```

### Step 1.2: Backup Original Files

**IMPORTANT**: Before any migration, backup all files:

```bash
# Create backup directory with timestamp
BACKUP_DIR="bak/modules_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all modules
cp -r src/modules/* "$BACKUP_DIR/"
```

### Step 1.3: Setup Code Quality Tools

```json
// .eslintrc.js
module.exports = {
  extends: ['@sdkwork/eslint-config'],
  rules: {
    'import/no-extraneous-dependencies': 'error',
  },
};
```

---

## Phase 2: Core Package Development

### Three Core Packages

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| `sdkwork-react-commons` | Common UI components and utilities | None |
| `sdkwork-react-i18n` | Internationalization solution | None |
| `sdkwork-react-core` | Core functionality (routing, state) | commons, i18n |

### sdkwork-react-commons

```
packages/sdkwork-react-commons/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   ├── Button.types.ts
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── vitest.config.ts
```

**package.json:**

```json
{
  "name": "@sdkwork/react-commons",
  "version": "1.0.0",
  "description": "Common UI components and utilities for SDKWork React applications",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "CHANGELOG.md"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "react": "^18.0.0",
    "tsup": "^7.0.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.your-company.com"
  },
  "author": "SDKWork Team",
  "license": "MIT"
}
```

### sdkwork-react-i18n

```
packages/sdkwork-react-i18n/
├── src/
│   ├── provider/
│   │   ├── I18nProvider.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useTranslation.ts
│   │   ├── useLocale.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── plural.ts
│   │   └── index.ts
│   ├── locales/
│   │   ├── en.json
│   │   ├── zh-CN.json
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

### sdkwork-react-core

```
packages/sdkwork-react-core/
├── src/
│   ├── router/
│   │   ├── Router.tsx
│   │   ├── routes.ts
│   │   ├── guards.ts
│   │   └── index.ts
│   ├── store/
│   │   ├── store.ts
│   │   ├── middleware.ts
│   │   └── index.ts
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

---

## Phase 3: Business Module Migration

### Step 3.1: Analyze Dependencies

Create a dependency graph before migration:

```typescript
// scripts/analyze-dependencies.ts
const moduleDependencies = {
  'user': ['auth', 'profile'],
  'dashboard': ['user', 'analytics'],
  'settings': ['user'],
  'auth': [],
  'profile': ['user'],
  'analytics': [],
};

// Calculate migration order
function getMigrationOrder(deps: Record<string, string[]>): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  
  function visit(module: string) {
    if (visited.has(module)) return;
    visited.add(module);
    
    const dependencies = deps[module] || [];
    for (const dep of dependencies) {
      visit(dep);
    }
    order.push(module);
  }
  
  for (const module of Object.keys(deps)) {
    visit(module);
  }
  
  return order;
}

// Output: ['auth', 'analytics', 'user', 'profile', 'settings', 'dashboard']
```

### Step 3.2: Migration Order

1. **Core packages first** (commons, i18n, core)
2. **Base modules** (no dependencies on other modules)
3. **Dependent modules** (depend on base modules)
4. **Complex modules** (multiple dependencies)

### Step 3.3: Migration Process (Per Module)

For each module, follow these steps:

#### 1. Backup

```bash
# Create timestamped backup
BACKUP_DIR="bak/modules_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src/modules/user "$BACKUP_DIR/"
```

#### 2. Create Package Structure

```bash
mkdir -p packages/sdkwork-react-user/src/{pages,components,api,hooks,store,types,locales}
```

#### 3. Move Files (100% Complete)

```bash
# Move ALL files from module
cp -r src/modules/user/* packages/sdkwork-react-user/src/

# Verify file count
find src/modules/user -type f | wc -l
find packages/sdkwork-react-user/src -type f | wc -l
```

#### 4. Update Imports

```typescript
// Before
import { Button } from '../../../components/Button';
import { useAuth } from '../../hooks/useAuth';

// After
import { Button } from '@sdkwork/react-commons';
import { useTranslation } from '@sdkwork/react-i18n';
import { useRouter } from '@sdkwork/react-core';
```

#### 5. Configure package.json

```json
{
  "name": "@sdkwork/react-user",
  "version": "1.0.0",
  "description": "User management module for SDKWork React applications",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md"],
  "scripts": {
    "dev": "vite",
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "build:app": "vite build",
    "test": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "@sdkwork/react-commons": "^1.0.0",
    "@sdkwork/react-i18n": "^1.0.0",
    "@sdkwork/react-core": "^1.0.0"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "react": "^18.0.0",
    "vite": "^5.0.0",
    "tsup": "^7.0.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
```

#### 6. Add i18n Configuration

```typescript
// src/locales/zh-CN.json
{
  "user": {
    "title": "用户管理",
    "create": "创建用户",
    "edit": "编辑用户",
    "delete": "删除用户",
    "confirmDelete": "确定要删除该用户吗？"
  }
}

// src/locales/en.json
{
  "user": {
    "title": "User Management",
    "create": "Create User",
    "edit": "Edit User",
    "delete": "Delete User",
    "confirmDelete": "Are you sure you want to delete this user?"
  }
}
```

#### 7. Dual Mode Support

```typescript
// src/main.tsx (for standalone app)
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './locales';

createRoot(document.getElementById('root')!).render(<App />);

// src/index.ts (for package export)
export { UserList } from './pages/UserList';
export { UserForm } from './pages/UserForm';
export { useUser } from './hooks/useUser';
export type { User, UserFormData } from './types';
```

---

## Phase 4: Dependency Management

### Update Import Paths

```typescript
// tsconfig.json (root)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@sdkwork/react-commons": ["packages/sdkwork-react-commons/src"],
      "@sdkwork/react-i18n": ["packages/sdkwork-react-i18n/src"],
      "@sdkwork/react-core": ["packages/sdkwork-react-core/src"],
      "@sdkwork/react-user": ["packages/sdkwork-react-user/src"]
    }
  }
}
```

### Workspace Configuration

```json
// package.json (root)
{
  "name": "sdkwork-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.10.0"
  }
}
```

---

## Phase 5: Cleanup & Validation

### Pre-Delete Checklist

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Documentation updated
- [ ] Code review completed
- [ ] i18n coverage 100%

### Delete Original

```bash
# Only after validation
rm -rf src/modules/user
```

---

## Quality Control

### i18n Check

```bash
# Find hardcoded Chinese strings
grep -rn "[\u4e00-\u9fa5]" packages/sdkwork-react-user/src --include="*.tsx" --include="*.ts" | grep -v "locales" | grep -v "i18n"
```

### Naming Check

```bash
# Verify package names follow convention
ls packages/ | grep -E "^sdkwork-react-"
```

### Test Coverage

```bash
# Run tests with coverage (minimum 80%)
npm test -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'
```

---

## Progress Report Template

```markdown
## Migration Progress Report - [DATE]

### Summary
- Total modules: X
- Migrated: Y
- In progress: Z
- Remaining: W

### Completed
- [x] Core packages (commons, i18n, core)
- [x] Module: auth
- [x] Module: user

### In Progress
- [ ] Module: dashboard (50%)
  - Files moved: 15/30
  - Tests passing: 10/15

### Pending
- [ ] Module: settings
- [ ] Module: analytics

### Issues
| Issue | Status | Solution |
|-------|--------|----------|
| Circular dependency in user module | Resolved | Extracted shared types to commons |

### Metrics
| Metric | Value | Target |
|--------|-------|--------|
| Test coverage | 85% | 80% |
| Build time | 45s | < 60s |
| Bundle size | 250KB | < 300KB |
| TypeScript errors | 0 | 0 |

### Next Steps
1. Complete dashboard module migration
2. Start settings module
3. Update documentation
```
