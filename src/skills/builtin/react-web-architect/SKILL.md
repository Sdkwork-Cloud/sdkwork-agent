---
name: react-web-architect
description: |
  React PC web application architect for architecture design, creation, and refactoring.
  Specializes in React PC web frontend architecture, component design, and monorepo migration.
  
  Capabilities:
  - Architecture Design: Design scalable React application architecture
  - Project Creation: Create new React projects with best practices
  - Code Refactoring: Refactor existing codebases for better maintainability
  - Monorepo Migration: Migrate monolithic apps to monorepo structure
  - Component Design: Design reusable component patterns
  - State Management: Implement optimal state management solutions
  
  Use when:
  - User wants to design React PC web application architecture
  - User needs to create a new React project
  - User wants to refactor existing React codebase
  - User needs to modularize into packages
  - User wants to implement proper folder structure
  - User needs to implement feature-based architecture
---

# React Web Architect

Professional React PC web application architect for architecture design, creation, and refactoring.

## Language & Framework

- **Language**: TypeScript / JavaScript
- **Framework**: React 18+
- **Build Tools**: Vite, Webpack, Next.js

## Target Applications

- PC Web Applications (React)
- Admin Dashboards
- Enterprise Frontend Systems
- E-commerce Frontends

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **Design** | Architecture design, pattern selection |
| **Create** | Project scaffolding, boilerplate generation |
| **Refactor** | Code restructuring, migration |
| **Optimize** | Performance tuning, bundle optimization |

## Quick Start

1. Read `references/input-guidelines.md` to understand user intent
2. Read `references/core-workflow.md` for the complete refactoring process
3. Read `references/monorepo-migration.md` for package migration guide
4. Load specific reference files based on refactoring needs (see Progressive Loading)
5. Use templates from `assets/templates/` for code generation

---

## Progressive Loading Strategy (Critical)

### Core Principle

**Never load all reference files upfront.** Load only what's needed based on user input.

### Three-Layer Architecture

| Layer | What's Loaded | When to Load |
|-------|---------------|--------------|
| **Layer 1 (Always)** | SKILL.md frontmatter + body | Always in context |
| **Layer 2 (First Use)** | `core-workflow.md`, `input-guidelines.md` | On first skill activation |
| **Layer 3 (On-Demand)** | All other reference files | Load ONLY when specific needs detected |

### Which Files to Load When?

| User Input Contains | Load These Files |
|---------------------|------------------|
| Basic refactoring | `output-examples-basics.md` |
| Folder structure | `folder-structure-guide.md` |
| Component splitting | `component-patterns.md` |
| State management | `state-management-guide.md` |
| Hooks refactoring | `hooks-patterns.md` |
| Feature-based architecture | `feature-architecture.md` |
| Performance optimization | `performance-guide.md` |
| TypeScript migration | `typescript-migration.md` |
| Testing setup | `testing-guide.md` |

---

## Core Capabilities

### 1. Architecture Analysis

- Analyze existing codebase structure
- Identify architectural issues and anti-patterns
- Detect code smells and technical debt
- Evaluate component coupling and cohesion

### 2. Refactoring Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Component Extraction** | Split large components | Component > 300 lines |
| **Custom Hooks** | Extract reusable logic | Duplicate stateful logic |
| **Feature Slicing** | Organize by feature | Growing codebase |
| **Container/Presentational** | Separate logic/UI | Complex state management |
| **Module Federation** | Micro-frontend setup | Large enterprise apps |

### 3. Output Format

```json
{
  "analysis": {
    "currentIssues": ["issue1", "issue2"],
    "complexity": "medium|high",
    "recommendations": ["rec1", "rec2"]
  },
  "refactoring": {
    "steps": [
      {
        "order": 1,
        "action": "description",
        "files": ["file1.tsx", "file2.tsx"],
        "template": "template-name"
      }
    ],
    "newStructure": {
      "folders": ["folder1", "folder2"],
      "files": ["file1.tsx", "file2.tsx"]
    }
  },
  "codeExamples": {
    "before": "// original code",
    "after": "// refactored code"
  }
}
```

---

## Supported Patterns

### Component Patterns

| Pattern | Use Case | Template |
|---------|----------|----------|
| Container/Presentational | Separate logic from UI | `container-component.tsx` |
| Compound Components | Flexible composition | `compound-component.tsx` |
| Render Props | Share code between components | `render-props.tsx` |
| Higher-Order Components | Cross-cutting concerns | `hoc.tsx` |
| Custom Hooks | Reusable stateful logic | `custom-hook.ts` |

### Architecture Patterns

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| Feature-Sliced Design | Large scale apps | `feature-architecture.md` |
| Atomic Design | Component libraries | `atomic-design.md` |
| Domain-Driven | Enterprise apps | `ddd-frontend.md` |

---

## Workflow

### Step 1: Analyze Current State

1. Request codebase structure or file contents
2. Identify architectural issues
3. Assess complexity and scope

### Step 2: Define Target Architecture

1. Propose folder structure
2. Define module boundaries
3. Plan migration strategy

### Step 3: Generate Refactoring Steps

1. Break down into incremental steps
2. Provide code examples for each step
3. Include testing considerations

### Step 4: Validate and Iterate

1. Review changes with user
2. Adjust based on feedback
3. Provide additional guidance

---

## Best Practices

### File Naming

```
components/
├── Button/
│   ├── Button.tsx          # Component
│   ├── Button.styles.ts    # Styles
│   ├── Button.types.ts     # Types
│   ├── Button.test.tsx     # Tests
│   └── index.ts            # Export
```

### Folder Structure

```
src/
├── features/           # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
├── components/         # Shared components
├── hooks/              # Shared hooks
├── utils/              # Utility functions
├── api/                # API layer
├── types/              # Global types
└── constants/          # Constants
```

---

## Limitations

- Cannot directly modify files (provides recommendations only)
- Requires user to provide code context
- May need multiple iterations for complex refactorings
- Performance analysis requires runtime data

---

## References

- [React Documentation](https://react.dev)
- [Feature-Sliced Design](https://feature-sliced.design)
- [React Patterns](https://reactpatterns.com)
