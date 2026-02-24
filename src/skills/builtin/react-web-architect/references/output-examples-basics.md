# Output Examples - Basics

## Basic Refactoring Output

### Input: Simple Component

```typescript
// Before: Large component with mixed concerns
function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('name');
  
  useEffect(() => {
    fetchUsers()
      .then(data => setUsers(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);
  
  const filteredUsers = users.filter(u => 
    u.name.includes(filter)
  );
  
  const sortedUsers = filteredUsers.sort((a, b) => 
    a[sort] > b[sort] ? 1 : -1
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <input 
        value={filter} 
        onChange={e => setFilter(e.target.value)} 
        placeholder="Filter users"
      />
      <select onChange={e => setSort(e.target.value)}>
        <option value="name">Name</option>
        <option value="email">Email</option>
      </select>
      <ul>
        {sortedUsers.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Output: Refactored Structure

```json
{
  "analysis": {
    "currentIssues": [
      "Component handles data fetching, filtering, and rendering",
      "No separation of concerns",
      "State logic could be extracted to custom hooks"
    ],
    "complexity": "medium",
    "recommendations": [
      "Extract data fetching to custom hook",
      "Extract filtering/sorting to custom hook",
      "Split into smaller components"
    ]
  },
  "refactoring": {
    "steps": [
      {
        "order": 1,
        "action": "Create useUsers hook for data fetching",
        "files": ["hooks/useUsers.ts"],
        "template": "custom-hook"
      },
      {
        "order": 2,
        "action": "Create useUserFilters hook for filtering/sorting",
        "files": ["hooks/useUserFilters.ts"],
        "template": "custom-hook"
      },
      {
        "order": 3,
        "action": "Create UserList component for rendering",
        "files": ["components/UserList.tsx"],
        "template": "component"
      },
      {
        "order": 4,
        "action": "Refactor UserDashboard to use new hooks and components",
        "files": ["components/UserDashboard.tsx"]
      }
    ],
    "newStructure": {
      "folders": ["hooks", "components"],
      "files": [
        "hooks/useUsers.ts",
        "hooks/useUserFilters.ts",
        "components/UserList.tsx",
        "components/UserDashboard.tsx"
      ]
    }
  }
}
```

### Output: Refactored Code

```typescript
// hooks/useUsers.ts
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { users, loading, error };
}

// hooks/useUserFilters.ts
export function useUserFilters(users: User[]) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<keyof User>('name');

  const filteredUsers = useMemo(
    () => users.filter(u => u.name.includes(filter)),
    [users, filter]
  );

  const sortedUsers = useMemo(
    () => [...filteredUsers].sort((a, b) => 
      a[sort] > b[sort] ? 1 : -1
    ),
    [filteredUsers, sort]
  );

  return { 
    filteredUsers: sortedUsers, 
    filter, 
    setFilter, 
    sort, 
    setSort 
  };
}

// components/UserList.tsx
interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.name} - {user.email}
        </li>
      ))}
    </ul>
  );
}

// components/UserDashboard.tsx
export function UserDashboard() {
  const { users, loading, error } = useUsers();
  const { filteredUsers, filter, setFilter, sort, setSort } = useUserFilters(users);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <UserFilters 
        filter={filter} 
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
      />
      <UserList users={filteredUsers} />
    </div>
  );
}
```
