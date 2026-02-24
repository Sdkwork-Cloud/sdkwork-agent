# State Management Guide

## Choosing a Solution

### Decision Matrix

| App Size | Complexity | Recommendation |
|----------|------------|----------------|
| Small | Low | useState + Context |
| Small | Medium | Zustand / Jotai |
| Medium | Low | Context + useReducer |
| Medium | Medium | Zustand |
| Medium | High | Redux Toolkit |
| Large | Any | Redux Toolkit / MobX |

---

## Patterns

### 1. Local State (useState)

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### 2. Context + useReducer

```typescript
// State context
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

type Action = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' };

const initialState: AppState = {
  user: null,
  theme: 'light',
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

// Context setup
const StateContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);

function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}

// Custom hook
function useAppState() {
  const context = useContext(StateContext);
  if (!context) throw new Error('useAppState must be used within StateProvider');
  return context;
}
```

### 3. Zustand

```typescript
// store.ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// Usage
function UserProfile() {
  const { user, logout } = useUserStore();
  
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 4. Redux Toolkit

```typescript
// userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (id: string) => {
    const response = await api.getUser(id);
    return response.data;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    data: null as User | null,
    loading: false,
    error: null as string | null,
  },
  reducers: {
    setUser: (state, action) => {
      state.data = action.payload;
    },
    logout: (state) => {
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user';
      });
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
```

---

## Best Practices

### 1. Colocate State

```typescript
// Bad: Global state for everything
const useStore = create((set) => ({
  formInput: '',
  modalOpen: false,
  // Everything in one store
}));

// Good: Feature-based stores
const useFormStore = create((set) => ({
  input: '',
  setInput: (value) => set({ input: value }),
}));

const useModalStore = create((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
```

### 2. Derive State

```typescript
// Bad: Storing derived state
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0);

useEffect(() => {
  setItemCount(items.length);
}, [items]);

// Good: Derive on render
const [items, setItems] = useState([]);
const itemCount = items.length;
```

### 3. Normalize Data

```typescript
// Bad: Nested arrays
const [posts, setPosts] = useState([
  { id: 1, title: 'Post 1', comments: [...] },
  { id: 2, title: 'Post 2', comments: [...] },
]);

// Good: Normalized
const [entities, setEntities] = useState({
  posts: {
    1: { id: 1, title: 'Post 1', comments: [1, 2] },
    2: { id: 2, title: 'Post 2', comments: [3] },
  },
  comments: {
    1: { id: 1, text: 'Comment 1' },
    2: { id: 2, text: 'Comment 2' },
    3: { id: 3, text: 'Comment 3' },
  },
});
```

---

## Migration Strategies

### From Redux to Zustand

1. Create Zustand stores for each Redux slice
2. Update selectors to use Zustand hooks
3. Remove Redux dependencies
4. Clean up Provider setup

### From Context to Zustand

1. Identify Context usage
2. Create Zustand store with same shape
3. Replace useContext with Zustand hook
4. Remove Context Provider
