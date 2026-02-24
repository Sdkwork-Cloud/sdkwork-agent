---
name: react-backend-architect
description: |
  React backend/admin panel architect for architecture design, creation, and refactoring.
  Specializes in admin dashboards, management systems, and enterprise backend applications.
  
  Capabilities:
  - Architecture Design: Design scalable admin panel architecture
  - Project Creation: Create admin panels with RBAC, CRUD generators
  - Code Refactoring: Refactor existing admin systems
  - RBAC Implementation: Role-based access control systems
  - CRUD Generation: Auto-generate CRUD modules
  - Data Table Design: Complex data tables with filtering, sorting, export
  
  Use when:
  - User wants to design admin panel or backend management system
  - User needs to create a new admin dashboard
  - User wants to refactor existing admin system
  - User needs to implement RBAC (Role-Based Access Control)
  - User wants to create CRUD module generators
  - User needs to implement data tables with complex filtering
  - User wants to add permission management system
---

# React Backend Architect

Professional React backend/admin panel architect for architecture design, creation, and refactoring.

## Language & Framework

- **Language**: TypeScript / JavaScript
- **Framework**: React 18+
- **UI Library**: Ant Design Pro, React Admin

## Target Applications

- Admin Dashboards
- Content Management Systems (CMS)
- Enterprise Resource Planning (ERP)
- Customer Relationship Management (CRM)
- Data Management Platforms
- Internal Tools and Utilities

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **Design** | Admin architecture, permission model |
| **Create** | Admin scaffolding, CRUD generators |
| **Refactor** | Module restructuring, RBAC migration |
| **Secure** | Permission guards, audit logging |

## Key Features

### 1. RBAC System

```typescript
// Permission definition
interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export';
  conditions?: Record<string, unknown>;
}

// Role definition
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inherits?: string[];
}
```

### 2. CRUD Module Generator

```typescript
// Generated module structure
modules/
├── user/
│   ├── pages/
│   │   ├── UserList.tsx
│   │   ├── UserDetail.tsx
│   │   └── UserForm.tsx
│   ├── api/
│   │   └── userApi.ts
│   ├── hooks/
│   │   └── useUser.ts
│   ├── store/
│   │   └── userStore.ts
│   └── types/
│       └── user.types.ts
```

### 3. Data Table System

- Server-side pagination
- Advanced filtering
- Column customization
- Export functionality
- Bulk operations

## Quick Start

1. Read `references/input-guidelines.md` to understand user intent
2. Read `references/core-workflow.md` for the complete refactoring process
3. Read `references/rbac-implementation.md` for permission system
4. Load specific reference files based on needs (see Progressive Loading)
5. Use templates from `assets/templates/` for code generation

---

## Progressive Loading Strategy

| User Input Contains | Load These Files |
|---------------------|------------------|
| Permission/RBAC | `rbac-implementation.md` |
| CRUD generation | `crud-generator.md` |
| Data tables | `data-table-guide.md` |
| Form builders | `form-builder-guide.md` |
| API integration | `api-integration.md` |
| Multi-tenant | `multi-tenant-guide.md` |
| Audit logging | `audit-logging.md` |

---

## Architecture Patterns

### Layered Architecture

```
src/
├── modules/              # Business modules
│   ├── user/
│   ├── role/
│   └── permission/
├── components/           # Shared components
│   ├── DataTable/
│   ├── FormBuilder/
│   └── PermissionGuard/
├── hooks/               # Shared hooks
│   ├── usePermission.ts
│   └── useCrud.ts
├── api/                 # API layer
│   ├── client.ts
│   └── interceptors.ts
├── store/               # Global state
│   └── permissionStore.ts
└── utils/               # Utilities
    └── permission.ts
```

---

## Core Components

### Permission Guard

```tsx
<PermissionGuard permission="user:read">
  <UserList />
</PermissionGuard>
```

### Data Table

```tsx
<DataTable
  columns={columns}
  dataSource={data}
  pagination={{ serverSide: true }}
  filters={filters}
  onExport={handleExport}
/>
```

### Form Builder

```tsx
<FormBuilder
  fields={fieldConfig}
  onSubmit={handleSubmit}
  validation={validationRules}
/>
```

---

## Output Format

```json
{
  "analysis": {
    "currentIssues": ["No RBAC system", "Monolithic structure"],
    "recommendations": ["Implement permission guard", "Split into modules"]
  },
  "modules": {
    "toCreate": ["permission", "role", "audit"],
    "toRefactor": ["user", "dashboard"]
  },
  "rbac": {
    "roles": ["admin", "manager", "viewer"],
    "permissions": ["user:read", "user:write"]
  },
  "codeExamples": {
    "permissionGuard": "// code",
    "crudModule": "// code"
  }
}
```

---

## References

- [Ant Design Pro](https://pro.ant.design)
- [React Admin](https://marmelab.com/react-admin)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)
