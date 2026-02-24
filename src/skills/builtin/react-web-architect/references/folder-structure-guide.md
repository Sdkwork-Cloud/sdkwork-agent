# Folder Structure Guide

## Recommended Structures

### Option 1: Feature-Based (Recommended for Medium-Large Apps)

```
src/
├── app/                    # App-level configuration
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── features/               # Feature modules
│   ├── auth/
│   │   ├── api/
│   │   │   └── authApi.ts
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   └── profile/
│       └── ...
│
├── components/             # Shared components
│   ├── ui/                 # Basic UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Modal/
│   │
│   └── layout/             # Layout components
│       ├── Header/
│       ├── Sidebar/
│       └── Footer/
│
├── hooks/                  # Shared hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
│
├── utils/                  # Utility functions
│   ├── format.ts
│   ├── validation.ts
│   └── constants.ts
│
├── api/                    # API configuration
│   ├── client.ts
│   └── endpoints.ts
│
├── types/                  # Global types
│   └── common.types.ts
│
└── styles/                 # Global styles
    └── globals.css
```

### Option 2: Layered (Simple Apps)

```
src/
├── components/
│   ├── pages/
│   ├── layouts/
│   └── common/
│
├── hooks/
├── utils/
├── services/
├── types/
└── constants/
```

### Option 3: Domain-Driven (Enterprise)

```
src/
├── domains/
│   ├── user/
│   │   ├── application/    # Use cases
│   │   ├── domain/         # Business logic
│   │   ├── infrastructure/ # Data access
│   │   └── presentation/   # UI components
│   │
│   └── product/
│       └── ...
│
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
│
└── core/
    ├── config/
    └── types/
```

---

## Component Folder Structure

### Single File Component

```
Button/
├── Button.tsx
└── index.ts
```

### Complex Component

```
UserCard/
├── UserCard.tsx           # Main component
├── UserCard.styles.ts     # Styled components / CSS modules
├── UserCard.types.ts      # TypeScript types
├── UserCard.test.tsx      # Tests
├── UserCard.stories.tsx   # Storybook
├── UserCard.hooks.ts      # Component-specific hooks
├── components/            # Sub-components
│   ├── UserAvatar.tsx
│   └── UserInfo.tsx
└── index.ts               # Public exports
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `Button.tsx` |
| Hook | camelCase with use prefix | `useAuth.ts` |
| Utility | camelCase | `formatDate.ts` |
| Type | PascalCase with .types | `user.types.ts` |
| Test | Same as source + .test | `Button.test.tsx` |
| Story | Same as source + .stories | `Button.stories.tsx` |

### Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature | kebab-case | `user-profile/` |
| Component | PascalCase | `Button/` |
| Utility | kebab-case | `date-utils/` |

---

## Import Aliases

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@features/*": ["src/features/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@api/*": ["src/api/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### Usage

```typescript
// Before
import { Button } from '../../../components/Button';
import { useAuth } from '../../hooks/useAuth';

// After
import { Button } from '@components/Button';
import { useAuth } from '@hooks/useAuth';
```

---

## Migration Checklist

### From Flat Structure

- [ ] Create feature folders
- [ ] Move related components together
- [ ] Create barrel exports
- [ ] Update all imports
- [ ] Setup path aliases

### From Nested Structure

- [ ] Flatten deep nesting
- [ ] Group by feature
- [ ] Extract shared components
- [ ] Simplify imports
