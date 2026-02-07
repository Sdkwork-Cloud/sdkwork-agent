# Built-in Skills Directory Structure

This directory contains built-in skills following the **Agent Skills Specification**.

## Directory Structure

```
src/skills/builtin/
├── echo/                   # Debug utility
│   └── SKILL.md
├── math/                   # Mathematical calculations
│   └── SKILL.md
├── list-skills/            # Skill discovery
│   └── SKILL.md
├── lyrics-generator/       # Music lyrics creation
│   └── SKILL.md
├── index.ts                # TypeScript implementations
└── builtin.ts              # Re-export file
```

## SKILL.md Format

Each skill directory contains a `SKILL.md` file with:

### YAML Frontmatter (Required)

```yaml
---
name: skill-name # Required: 1-64 chars, lowercase alphanumeric + hyphens
description: Description # Required: 1-1024 chars, what it does + when to use it
license: MIT # Optional: License name
compatibility: Requirements # Optional: Environment requirements
metadata:
  author: Author Name # Optional
  version: '1.0.0' # Optional
  category: category-name # Optional: For organization
  tags: 'tag1 tag2 tag3' # Optional: Space-separated tags
---
```

### Markdown Body

After the frontmatter, include:

- Detailed description
- Usage examples
- Parameter documentation
- Notes and limitations

## Naming Conventions

Per Agent Skills Specification:

- ✅ Valid: `echo`, `math`, `list-skills`, `pdf-extract`
- ❌ Invalid: `Echo` (uppercase), `-echo` (starts with hyphen), `echo--test` (consecutive hyphens)

## TypeScript Implementation

While SKILL.md provides the metadata and documentation, the actual implementation is in `index.ts`:

```typescript
export const skillName: Skill = {
  name: 'skill-name',
  description: '...',
  parameters: { ... },
  handler: async (params, context) => { ... },
  metadata: { ... },
};
```

## Adding New Skills

1. Create directory: `mkdir src/skills/builtin/my-skill`
2. Create SKILL.md with proper frontmatter
3. Add implementation to `index.ts`
4. Export from `builtin.ts`
5. Register in agent initialization

## Progressive Disclosure

Following the Agent Skills Specification:

1. **Metadata** (~100 tokens): Loaded at startup
   - `name` and `description` from frontmatter
2. **Instructions** (<5000 tokens): Loaded when skill is activated
   - Full SKILL.md body
3. **Resources** (as needed): Loaded on demand
   - `scripts/`, `references/`, `assets/` directories

## References

- [Agent Skills Specification](https://agentskills.io/specification)
