# Agent Development Guide

This document provides guidelines for AI agents working in this repository.

## Build Commands

```bash
# Build for production (outputs CJS + ESM + types)
npm run build

# Watch mode for development
npm run build:watch

# Development server with hot reload
npm run dev

# Clean build artifacts
npm run clean
```

## Lint & Type Check Commands

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Type check without emitting
npm run typecheck

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Test Commands

```bash
# Run all tests
npm run test

# Watch mode for tests
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run single test file
npm run test:file -- tests/agent.test.ts

# Run tests matching pattern
npx vitest run --reporter=verbose tests/agent
```

## Code Style Guidelines

### TypeScript

- **Target**: ES2022, strict mode enabled
- **Return types**: Explicit on all public functions
- **No `any`**: Use `unknown` with type guards instead
- **Null safety**: Enable strict null checks
- **Unused**: No unused locals/parameters (prefix with `_` to ignore)

### Imports

```typescript
// Order: external libs → internal modules → types
import { z } from 'zod';
import { Agent } from './core/agent';
import type { Skill, Tool } from './core/agent';

// Use path aliases:
// @/* → src/*
// @core/* → src/core/*
// @skills/* → src/skills/*
// @tools/* → src/tools/*
// @mcp/* → src/mcp/*
// @plugins/* → src/plugins/*
```

### Naming Conventions

- **Files**: kebab-case.ts (e.g., `skill-registry.ts`)
- **Classes**: PascalCase (e.g., `Agent`, `SkillRegistry`)
- **Interfaces**: PascalCase with descriptive names (e.g., `SkillResult`)
- **Functions**: camelCase, verbs (e.g., `executeSkill`, `registerTool`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Private members**: prefix with `_` (e.g., `_skills`)

### Error Handling

```typescript
// Always return structured results
type Result<T> = { success: true; data: T } | { success: false; error: string };

// Use try/catch at boundaries
async function executeSkill(name: string): Promise<SkillResult> {
  try {
    const result = await handler();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Formatting (Prettier)

- Semi-colons: required
- Single quotes
- Trailing commas: ES5 compatible
- Print width: 100
- Tab width: 2 spaces

## Architecture

This is a browser-compatible agent system following the [Agent Skills Specification](https://agentskills.io/specification).

### Core Components

- **Agent**: Central orchestrator for skills, tools, MCP resources
- **SmartAgent**: Auto-decision agent with skill selection and token optimization
- **Skill**: User-facing capabilities with typed parameters
- **Tool**: Low-level execution units
- **MCP**: Model Context Protocol resources and tools
- **Plugin**: Extensible module system

### Smart Agent Features

- **Automatic Skill Selection**: Uses embeddings and similarity matching
- **Dynamic Skill Loading**: Lazy load skills from files, URLs, or modules
- **Token Optimization**: Minimize token consumption for LLM calls
- **Decision Engine**: Intelligent routing between skills, tools, and LLM

### File Structure

```
src/
├── core/              # Agent core and types
│   ├── agent.ts       # Base Agent class
│   ├── smart-agent.ts # SmartAgent with auto-decision
│   ├── decision-engine.ts  # Skill selection engine
│   ├── skill-loader.ts     # Dynamic skill loading
│   └── token-optimizer.ts  # Token optimization
├── llm/               # LLM provider implementations
├── skills/            # Skill implementations
├── tools/             # Tool implementations
├── mcp/               # MCP resources and tools
├── plugins/           # Plugin system
└── types/             # Shared type definitions
```

### Testing

- Framework: Vitest with jsdom environment
- Location: `tests/` directory
- Pattern: `*.test.ts` or `*.spec.ts`
- Coverage: v8 provider, exclude tests/

## Before Committing

Always run:

```bash
npm run lint && npm run typecheck && npm run test
```

## Environment

- Node.js >= 18.0.0
- TypeScript 5.3+
- Browser + Node.js compatible builds
