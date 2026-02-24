# RBAC Implementation Guide

## Overview

Role-Based Access Control (RBAC) system implementation for React admin panels.

---

## Core Concepts

### Permission Model

```typescript
// Permission definition
interface Permission {
  resource: string;        // e.g., 'user', 'order', 'product'
  action: PermissionAction; // 'create' | 'read' | 'update' | 'delete' | 'export'
  conditions?: {
    own?: boolean;         // Only own records
    department?: string;   // Specific department
  };
}

// Role definition
interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  inherits?: string[];     // Inherit from other roles
}

// User with roles
interface User {
  id: string;
  roles: string[];
  permissions: Permission[]; // Computed from roles
}
```

---

## Implementation

### 1. Permission Store

```typescript
// stores/permissionStore.ts
import { create } from 'zustand';

interface PermissionState {
  roles: Role[];
  userPermissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  loadUserPermissions: (userId: string) => Promise<void>;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  roles: [],
  userPermissions: [],
  
  hasPermission: (permission) => {
    const { userPermissions } = get();
    return userPermissions.some(p => 
      p.resource === permission.resource && 
      p.action === permission.action
    );
  },
  
  hasAnyPermission: (permissions) => {
    return permissions.some(p => get().hasPermission(p));
  },
  
  loadUserPermissions: async (userId) => {
    const response = await api.getUserPermissions(userId);
    set({ userPermissions: response.permissions, roles: response.roles });
  },
}));
```

### 2. Permission Guard Component

```typescript
// components/PermissionGuard.tsx
interface PermissionGuardProps {
  permission: Permission | Permission[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({ 
  permission, 
  mode = 'all', 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = usePermissionStore();
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = mode === 'any' 
    ? hasAnyPermission(permissions)
    : permissions.every(p => hasPermission(p));
  
  if (!hasAccess) return <>{fallback}</>;
  
  return <>{children}</>;
}
```

### 3. Permission Hook

```typescript
// hooks/usePermission.ts
export function usePermission() {
  const store = usePermissionStore();
  
  const can = useCallback((resource: string, action: PermissionAction) => {
    return store.hasPermission({ resource, action });
  }, [store]);
  
  const canAny = useCallback((permissions: Permission[]) => {
    return store.hasAnyPermission(permissions);
  }, [store]);
  
  return { can, canAny, ...store };
}
```

### 4. Protected Routes

```typescript
// router/ProtectedRoute.tsx
interface ProtectedRouteProps {
  path: string;
  permission?: Permission;
  element: React.ReactNode;
}

export function ProtectedRoute({ path, permission, element }: ProtectedRouteProps) {
  const { hasPermission } = usePermissionStore();
  
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  return <Route path={path} element={element} />;
}
```

---

## Usage Examples

### In Components

```tsx
// Hide button if no permission
<PermissionGuard permission={{ resource: 'user', action: 'create' }}>
  <Button>Create User</Button>
</PermissionGuard>

// Show fallback
<PermissionGuard 
  permission={{ resource: 'user', action: 'delete' }}
  fallback={<Button disabled>Delete</Button>}
>
  <Button danger>Delete</Button>
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard 
  permission={[
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' }
  ]}
  mode="any"
>
  <ActionButtons />
</PermissionGuard>
```

### In Hooks

```tsx
function UserActions({ user }) {
  const { can } = usePermission();
  
  return (
    <div>
      {can('user', 'update') && <EditButton />}
      {can('user', 'delete') && <DeleteButton />}
    </div>
  );
}
```

---

## Backend Integration

### API Endpoints

```
GET  /api/permissions          # Get all permissions
GET  /api/roles                # Get all roles
POST /api/roles                # Create role
PUT  /api/roles/:id            # Update role
DELETE /api/roles/:id          # Delete role
GET  /api/users/:id/permissions # Get user permissions
POST /api/users/:id/roles      # Assign roles to user
```

### Permission Check Middleware

```typescript
// Backend middleware
function checkPermission(resource: string, action: string) {
  return (req, res, next) => {
    const user = req.user;
    if (!user.permissions.some(p => 
      p.resource === resource && p.action === action
    )) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
router.delete('/users/:id', 
  authMiddleware, 
  checkPermission('user', 'delete'), 
  deleteUser
);
```

---

## Role Hierarchy

```typescript
const roleHierarchy = {
  super_admin: {
    inherits: ['admin'],
    permissions: [{ resource: '*', action: '*' }],
  },
  admin: {
    inherits: ['manager'],
    permissions: [
      { resource: 'user', action: '*' },
      { resource: 'role', action: '*' },
    ],
  },
  manager: {
    inherits: ['user'],
    permissions: [
      { resource: 'order', action: '*' },
      { resource: 'product', action: 'read' },
    ],
  },
  user: {
    permissions: [
      { resource: 'profile', action: 'read' },
      { resource: 'profile', action: 'update' },
    ],
  },
};
```

---

## Best Practices

1. **Principle of Least Privilege**: Grant minimum permissions needed
2. **Deny by Default**: Block access unless explicitly granted
3. **Audit Logging**: Log all permission checks
4. **Cache Permissions**: Store in localStorage/sessionStorage
5. **Regular Review**: Periodically review role assignments
