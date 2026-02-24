# Core Workflow

## Complete Refactoring Process

### Phase 1: Discovery

#### Step 1.1: Gather Information

```
Input: User request
Action: Ask clarifying questions
Output: Refactoring scope and goals
```

Questions to ask:
1. What's the current project structure?
2. What are the main pain points?
3. What's the project scale?
4. Any specific constraints?

#### Step 1.2: Analyze Codebase

```
Input: Codebase structure/files
Action: Identify issues and patterns
Output: Analysis report
```

Analysis checklist:
- [ ] Component size distribution
- [ ] Dependency graph
- [ ] State management patterns
- [ ] Code duplication
- [ ] Folder organization

---

### Phase 2: Planning

#### Step 2.1: Define Target Architecture

Choose based on project needs:

| Architecture | Best For | Complexity |
|--------------|----------|------------|
| **Feature-Based** | Medium-Large apps | Medium |
| **Layered** | Simple apps | Low |
| **Domain-Driven** | Enterprise apps | High |
| **Micro-Frontend** | Large teams | Very High |

#### Step 2.2: Create Migration Plan

```json
{
  "phases": [
    {
      "name": "Foundation",
      "steps": ["Setup folder structure", "Create shared utilities"],
      "duration": "1-2 days"
    },
    {
      "name": "Core Migration",
      "steps": ["Migrate components", "Update imports"],
      "duration": "3-5 days"
    },
    {
      "name": "Optimization",
      "steps": ["Performance tuning", "Code splitting"],
      "duration": "1-2 days"
    }
  ]
}
```

---

### Phase 3: Execution

#### Step 3.1: Create New Structure

1. Create folder hierarchy
2. Setup barrel exports
3. Configure path aliases

#### Step 3.2: Migrate Components

For each component:
1. Analyze dependencies
2. Extract reusable logic
3. Create new component file
4. Update imports
5. Test functionality

#### Step 3.3: Update Configuration

Files to update:
- `tsconfig.json` - Path aliases
- `vite.config.ts` / `webpack.config.js` - Aliases
- `jest.config.js` - Module paths
- `.eslintrc` - Import rules

---

### Phase 4: Validation

#### Step 4.1: Verify Functionality

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build succeeds

#### Step 4.2: Performance Check

- [ ] Bundle size acceptable
- [ ] No runtime errors
- [ ] Lighthouse score maintained

---

## Decision Matrix

### When to Refactor

| Signal | Priority | Action |
|--------|----------|--------|
| Component > 500 lines | High | Split immediately |
| Duplicate code > 3 places | High | Extract to utility |
| Slow build time | Medium | Optimize imports |
| Confusing folder structure | Medium | Reorganize |
| Mixed patterns | Low | Standardize gradually |

### When NOT to Refactor

- Close to deadline
- No test coverage
- Team not aligned
- No clear benefit

---

## Risk Mitigation

### Common Risks

| Risk | Mitigation |
|------|------------|
| Breaking changes | Incremental migration |
| Import errors | Use IDE refactoring tools |
| Test failures | Run tests after each change |
| Merge conflicts | Small, focused PRs |

### Rollback Strategy

1. Use feature branches
2. Keep old structure temporarily
3. Document all changes
4. Have rollback plan ready

---

## Communication Template

### Status Update

```markdown
## Refactoring Progress

### Completed
- [x] Setup new folder structure
- [x] Migrate shared components

### In Progress
- [ ] Feature module migration

### Blocked
- [ ] Waiting for: API types update

### Metrics
- Components migrated: 15/30
- Tests passing: 45/50
- Build time: 12s (was 18s)
```
