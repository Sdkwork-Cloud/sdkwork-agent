# Input Guidelines

## Understanding User Intent

### Primary Intents

| Intent | Keywords | Action |
|--------|----------|--------|
| **Full Refactoring** | "refactor", "restructure", "reorganize" | Complete architecture overhaul |
| **Component Splitting** | "split", "break down", "separate" | Extract components |
| **State Management** | "state", "redux", "context", "data flow" | Optimize state architecture |
| **Performance** | "slow", "optimize", "performance" | Performance-focused refactoring |
| **Migration** | "migrate", "upgrade", "convert" | Version or pattern migration |
| **Organization** | "organize", "structure", "folder" | File/folder restructuring |

### Input Analysis

#### Level 1: Quick Analysis

Ask for:
- Current project structure
- Main pain points
- Project size (components count, file count)

#### Level 2: Deep Analysis

Request:
- Specific file contents
- Component dependencies
- State management approach
- Build configuration

#### Level 3: Full Audit

For enterprise-level refactoring:
- Complete codebase access
- Team structure
- Deployment pipeline
- Performance metrics

---

## Input Patterns

### Pattern 1: Code Snippet

```
User provides: Component code
Expected: Specific refactoring recommendations
Output: Before/after code examples
```

### Pattern 2: File Structure

```
User provides: Folder tree
Expected: Structure optimization
Output: New folder structure + migration steps
```

### Pattern 3: Problem Description

```
User provides: "My app is slow when..."
Expected: Performance-focused solution
Output: Optimization steps + code changes
```

### Pattern 4: Migration Request

```
User provides: "Convert class components to hooks"
Expected: Migration guide
Output: Step-by-step conversion + examples
```

---

## Clarification Questions

### Essential Questions

1. **Project Scale**
   - How many components?
   - How many developers?
   - What's the team experience level?

2. **Current State**
   - What's working well?
   - What's causing issues?
   - Any specific pain points?

3. **Goals**
   - What do you want to achieve?
   - Any constraints or preferences?
   - Timeline considerations?

4. **Technical Context**
   - React version?
   - State management library?
   - Build tools?
   - TypeScript?

### Optional Questions

- Testing coverage?
- CI/CD pipeline?
- Design system?
- Component library?

---

## Output Customization

### By Experience Level

| Level | Output Style |
|-------|--------------|
| **Beginner** | Detailed explanations, step-by-step, more examples |
| **Intermediate** | Balanced, key concepts highlighted |
| **Advanced** | Concise, focus on patterns and trade-offs |

### By Project Size

| Size | Approach |
|------|----------|
| **Small (< 50 components)** | Quick wins, simple restructuring |
| **Medium (50-200)** | Feature-based organization, shared modules |
| **Large (200+)** | Micro-frontend consideration, strict boundaries |

---

## Edge Cases

### Case 1: Legacy Code

- Class components → Hooks migration
- Mix of patterns → Standardize
- Outdated dependencies → Upgrade path

### Case 2: Monorepo

- Package boundaries
- Shared dependencies
- Build optimization

### Case 3: Micro-Frontend

- Module federation setup
- Shared state strategy
- Routing architecture
