# Feature-Based Architecture

## Overview

Feature-based architecture organizes code by business features rather than technical layers.

## Core Principles

1. **Feature Independence**: Each feature is self-contained
2. **Explicit Dependencies**: Clear imports between features
3. **Shared Resources**: Common utilities in shared folder
4. **Scalability**: Easy to add/remove features

---

## Directory Structure

```
src/
├── app/                          # App configuration
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   └── index.ts
│
├── features/                     # Feature modules
│   ├── auth/
│   │   ├── api/                  # API calls
│   │   │   ├── authApi.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── components/           # Feature components
│   │   │   ├── LoginForm/
│   │   │   ├── RegisterForm/
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/                # Feature hooks
│   │   │   ├── useAuth.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── stores/               # Feature state
│   │   │   ├── authStore.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                # Feature types
│   │   │   ├── auth.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                # Feature utilities
│   │   │   └── validation.ts
│   │   │
│   │   └── index.ts              # Public API
│   │
│   ├── dashboard/
│   │   └── ...
│   │
│   └── settings/
│       └── ...
│
├── components/                   # Shared components
│   ├── ui/
│   ├── layout/
│   └── index.ts
│
├── hooks/                        # Shared hooks
│   └── index.ts
│
├── utils/                        # Shared utilities
│   └── index.ts
│
├── api/                          # API configuration
│   ├── client.ts
│   └── index.ts
│
├── types/                        # Global types
│   └── index.ts
│
└── styles/                       # Global styles
    └── globals.css
```

---

## Feature Module Structure

### Public API (index.ts)

```typescript
// features/auth/index.ts

// Components
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useLogin } from './hooks/useLogin';

// Types
export type { User, LoginCredentials, AuthState } from './types';

// Stores (if using Zustand)
export { useAuthStore } from './stores/authStore';
```

### Feature Component

```typescript
// features/auth/components/LoginForm/LoginForm.tsx
import { useLogin } from '../../hooks';
import { Button, Input } from '@/components/ui';
import type { LoginCredentials } from '../../types';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error } = useLogin();
  
  const handleSubmit = (credentials: LoginCredentials) => {
    login(credentials).then(onSuccess);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form implementation */}
    </form>
  );
}
```

### Feature Hook

```typescript
// features/auth/hooks/useLogin.ts
import { useAuthStore } from '../stores';
import { authApi } from '../api';
import type { LoginCredentials } from '../types';

export function useLogin() {
  const setUser = useAuthStore(s => s.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await authApi.login(credentials);
      setUser(user);
      return user;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { login, isLoading, error };
}
```

---

## Import Rules

### ✅ Allowed Imports

```typescript
// Feature can import from shared
import { Button } from '@/components/ui';
import { useDebounce } from '@/hooks';

// Feature can import from its own subdirectories
import { useAuth } from '../hooks';
import { authApi } from '../api';
```

### ❌ Forbidden Imports

```typescript
// Feature cannot import from another feature
import { useDashboard } from '@/features/dashboard';  // ❌

// Shared cannot import from features
import { useAuth } from '@/features/auth';  // ❌
```

### Cross-Feature Communication

```typescript
// Use events or shared state
// features/auth/stores/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// features/dashboard/hooks/useDashboard.ts
export function useDashboard() {
  const user = useAuthStore(s => s.user);  // ✅ Access via shared store
  // ...
}
```

---

## Migration Strategy

### Step 1: Create Feature Folders

```bash
mkdir -p src/features/{auth,dashboard,settings}
```

### Step 2: Move Components

1. Identify feature-specific components
2. Move to appropriate feature folder
3. Update imports

### Step 3: Extract Feature Logic

1. Create feature hooks
2. Create feature stores
3. Create feature API functions

### Step 4: Create Public APIs

1. Create index.ts for each feature
2. Export only public interface
3. Keep internal modules private

### Step 5: Update Imports

1. Replace relative imports with feature imports
2. Use path aliases
3. Remove cross-feature imports

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Modularity** | Features are self-contained |
| **Scalability** | Easy to add new features |
| **Maintainability** | Clear ownership and boundaries |
| **Testability** | Isolated feature testing |
| **Team Efficiency** | Teams can work independently |
