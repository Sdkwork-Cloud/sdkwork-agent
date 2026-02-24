# Migration Checklist

## Pre-Migration Checklist

### 1. Environment Setup

- [ ] Node.js version >= 18.0.0
- [ ] Package manager configured (npm/yarn/pnpm)
- [ ] ESLint configured
- [ ] Prettier configured
- [ ] TypeScript configured
- [ ] Vitest/Jest configured

### 2. Analysis

- [ ] Analyze module dependencies
- [ ] Create dependency graph
- [ ] Identify shared components
- [ ] Check i18n coverage
- [ ] Count total files

### 3. Backup

- [ ] Create backup directory with timestamp
- [ ] Copy all files to backup
- [ ] Verify backup integrity

```bash
# Backup command
BACKUP_DIR="bak/modules_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src/modules/* "$BACKUP_DIR/"
```

---

## Core Package Checklist

### sdkwork-react-commons

- [ ] Create package structure
- [ ] Move common components
- [ ] Move utility functions
- [ ] Move shared hooks
- [ ] Configure package.json
- [ ] Write unit tests (coverage >= 80%)
- [ ] Write README.md
- [ ] Write CHANGELOG.md
- [ ] Build succeeds
- [ ] Tests pass

### sdkwork-react-i18n

- [ ] Create package structure
- [ ] Move i18n provider
- [ ] Move translation hooks
- [ ] Move locale files
- [ ] Configure package.json
- [ ] Write unit tests (coverage >= 80%)
- [ ] Write README.md
- [ ] Build succeeds
- [ ] Tests pass

### sdkwork-react-core

- [ ] Create package structure
- [ ] Move router configuration
- [ ] Move store configuration
- [ ] Move providers
- [ ] Configure package.json
- [ ] Add dependencies on commons, i18n
- [ ] Write unit tests (coverage >= 80%)
- [ ] Write README.md
- [ ] Build succeeds
- [ ] Tests pass

---

## Business Module Checklist

### For Each Module: `[MODULE_NAME]`

#### Step 1: Pre-Migration

- [ ] Analyze module dependencies
- [ ] List all files to migrate
- [ ] Identify components to extract to commons
- [ ] Check for hardcoded strings (i18n)
- [ ] Create backup with timestamp

#### Step 2: Create Package

- [ ] Create package directory: `packages/sdkwork-react-[module]`
- [ ] Create subdirectories: `src/{pages,components,api,hooks,store,types,locales}`
- [ ] Create package.json
- [ ] Create tsconfig.json
- [ ] Create README.md

#### Step 3: Move Files

- [ ] Move all pages
- [ ] Move all components
- [ ] Move all API functions
- [ ] Move all hooks
- [ ] Move all store files
- [ ] Move all types
- [ ] Move all assets
- [ ] Verify file count matches

#### Step 4: Update Imports

- [ ] Update component imports to use @sdkwork/react-commons
- [ ] Update i18n imports to use @sdkwork/react-i18n
- [ ] Update router/store imports to use @sdkwork/react-core
- [ ] Update relative imports to absolute imports
- [ ] No TypeScript errors

#### Step 5: Add i18n

- [ ] Create locales/zh-CN.json
- [ ] Create locales/en.json
- [ ] Replace all hardcoded strings
- [ ] Verify i18n coverage 100%

#### Step 6: Configure Dual Mode

- [ ] Create src/main.tsx for standalone
- [ ] Create src/index.ts for package export
- [ ] Configure vite.config.ts
- [ ] Configure tsup.config.ts
- [ ] Test standalone mode works
- [ ] Test package build works

#### Step 7: Testing

- [ ] Write unit tests
- [ ] All tests pass
- [ ] Test coverage >= 70%
- [ ] No ESLint warnings
- [ ] No TypeScript errors

#### Step 8: Documentation

- [ ] Write README.md
- [ ] Document all exports
- [ ] Add usage examples
- [ ] Update main README

#### Step 9: Code Review

- [ ] Self-review completed
- [ ] Peer review completed
- [ ] All comments addressed

#### Step 10: Cleanup

- [ ] Delete original module from src/modules/
- [ ] Update root package.json workspaces
- [ ] Update tsconfig paths

---

## Post-Migration Checklist

### Validation

- [ ] All packages build successfully
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] i18n coverage 100%
- [ ] Test coverage >= 70%

### Integration

- [ ] Test package imports work
- [ ] Test standalone apps work
- [ ] Test cross-package dependencies

### Documentation

- [ ] Update main README
- [ ] Update architecture docs
- [ ] Create migration report

### Cleanup

- [ ] Remove backup files (after confirmation)
- [ ] Remove temporary scripts
- [ ] Update CI/CD configuration

---

## File Count Verification

```bash
# Before migration
find src/modules/[module] -type f | wc -l

# After migration
find packages/sdkwork-react-[module]/src -type f | wc -l

# Must match!
```

## i18n Verification

```bash
# Check for hardcoded strings
grep -rn "[\u4e00-\u9fa5]" packages/sdkwork-react-[module]/src --include="*.tsx" --include="*.ts" | grep -v "locales" | grep -v "i18n"

# Should return empty!
```

## Test Coverage Verification

```bash
# Run tests with coverage
cd packages/sdkwork-react-[module]
npm test -- --coverage

# Coverage should be >= 70%
```
