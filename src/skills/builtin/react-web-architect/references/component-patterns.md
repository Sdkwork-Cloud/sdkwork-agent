# Component Patterns

## Core Patterns

### 1. Container/Presentational Pattern

Separate logic from UI.

```typescript
// Presentational Component
// UserCard.tsx
interface UserCardProps {
  user: User;
  onEdit: () => void;
  isLoading?: boolean;
}

export function UserCard({ user, onEdit, isLoading }: UserCardProps) {
  if (isLoading) return <UserCardSkeleton />;
  
  return (
    <div className="user-card">
      <Avatar src={user.avatar} />
      <UserInfo user={user} />
      <Button onClick={onEdit}>Edit</Button>
    </div>
  );
}

// Container Component
// UserCardContainer.tsx
export function UserCardContainer({ userId }: { userId: string }) {
  const { user, isLoading, updateUser } = useUser(userId);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEdit = async (data: Partial<User>) => {
    await updateUser(data);
    setIsEditing(false);
  };
  
  if (isEditing) {
    return <UserEditForm user={user} onSubmit={handleEdit} />;
  }
  
  return (
    <UserCard 
      user={user} 
      isLoading={isLoading}
      onEdit={() => setIsEditing(true)} 
    />
  );
}
```

### 2. Custom Hooks Pattern

Extract reusable stateful logic.

```typescript
// Before: Logic in component
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  // ... render
}

// After: Extracted to hook
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  return { users, loading, error, refetch: () => fetchUsers().then(setUsers) };
}

// Usage
function UserList() {
  const { users, loading, error } = useUsers();
  // ... render
}
```

### 3. Compound Components Pattern

Flexible composition.

```typescript
// Tabs.tsx
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: ReactNode }) {
  return <div className="tabs-list">{children}</div>;
}

function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  
  return (
    <button 
      className={activeTab === id ? 'active' : ''} 
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab } = useContext(TabsContext)!;
  
  if (activeTab !== id) return null;
  return <div className="tab-panel">{children}</div>;
}

// Compound export
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs defaultTab="overview">
  <Tabs.List>
    <Tabs.Tab id="overview">Overview</Tabs.Tab>
    <Tabs.Tab id="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="overview"><Overview /></Tabs.Panel>
  <Tabs.Panel id="settings"><Settings /></Tabs.Panel>
</Tabs>
```

### 4. Render Props Pattern

Share code between components.

```typescript
interface MousePosition {
  x: number;
  y: number;
}

function MouseTracker({ children }: { children: (position: MousePosition) => ReactNode }) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return <>{children(position)}</>;
}

// Usage
<MouseTracker>
  {({ x, y }) => (
    <div>Mouse position: {x}, {y}</div>
  )}
</MouseTracker>
```

### 5. Higher-Order Component (HOC) Pattern

Cross-cutting concerns.

```typescript
interface WithLoadingProps {
  isLoading?: boolean;
}

function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>,
  LoadingComponent: ComponentType = () => <div>Loading...</div>
) {
  return function WithLoadingComponent({ isLoading, ...props }: P & WithLoadingProps) {
    if (isLoading) return <LoadingComponent />;
    return <WrappedComponent {...(props as P)} />;
  };
}

// Usage
const UserCardWithLoading = withLoading(UserCard);

<UserCardWithLoading user={user} isLoading={isLoading} />
```

---

## Anti-Patterns to Avoid

### 1. Prop Drilling

```typescript
// Bad
function App() {
  const [user, setUser] = useState();
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />;
}

function Sidebar({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

// Good: Use Context or State Management
const UserContext = createContext();

function App() {
  const [user, setUser] = useState();
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Layout />
    </UserContext.Provider>
  );
}
```

### 2. Giant Components

```typescript
// Bad: 500+ line component
function Dashboard() {
  // 100 lines of state
  // 50 lines of effects
  // 300 lines of JSX
  // 50 lines of handlers
}

// Good: Split into smaller components
function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardHeader />
      <DashboardStats />
      <DashboardCharts />
      <DashboardTable />
    </DashboardLayout>
  );
}
```

### 3. Mixed Concerns

```typescript
// Bad: Component handles everything
function UserList() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState('name');
  
  // API calls, filtering, sorting, rendering all mixed
}

// Good: Separate concerns
function UserList() {
  const { users, loading } = useUsers();
  const { filteredUsers, setFilter } = useUserFilters(users);
  const { sortedUsers, setSort } = useUserSort(filteredUsers);
  
  return <UserTableView users={sortedUsers} loading={loading} />;
}
```

---

## Component Size Guidelines

| Lines | Status | Action |
|-------|--------|--------|
| < 100 | Good | Keep as is |
| 100-200 | Acceptable | Consider extraction |
| 200-300 | Warning | Extract sub-components |
| > 300 | Critical | Must refactor |

---

## Extraction Checklist

When extracting a component:

- [ ] Identify clear responsibility
- [ ] Define props interface
- [ ] Move related styles
- [ ] Move related tests
- [ ] Update imports
- [ ] Add to barrel export
