# Hooks Patterns

## Custom Hook Categories

### 1. Data Fetching Hooks

```typescript
// Basic fetch hook
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

// With SWR pattern
function useSWR<T>(key: string, fetcher: () => Promise<T>) {
  const cache = useRef<Map<string, T>>(new Map());
  const [state, setState] = useState<{
    data?: T;
    loading: boolean;
    error?: Error;
  }>({ loading: true });

  useEffect(() => {
    if (cache.current.has(key)) {
      setState({ data: cache.current.get(key), loading: false });
      return;
    }

    fetcher()
      .then(data => {
        cache.current.set(key, data);
        setState({ data, loading: false });
      })
      .catch(error => setState({ error, loading: false }));
  }, [key]);

  return state;
}
```

### 2. Form Hooks

```typescript
function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(v => ({ ...v, [name]: e.target.value }));
  };

  const handleBlur = (name: keyof T) => () => {
    setTouched(t => ({ ...t, [name]: true }));
    if (validate) {
      setErrors(validate(values));
    }
  };

  const handleSubmit = (onSubmit: (values: T) => void) => (e: React.FormEvent) => {
    e.preventDefault();
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;
    }
    onSubmit(values);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
  };
}
```

### 3. UI Hooks

```typescript
// Toggle hook
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return { value, toggle, setTrue, setFalse, setValue };
}

// Media query hook
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### 4. Storage Hooks

```typescript
// Local storage hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    localStorage.setItem(key, JSON.stringify(valueToStore));
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
```

---

## Hook Composition

```typescript
// Combine multiple hooks
function useUserProfile(userId: string) {
  const { user, loading: userLoading } = useUser(userId);
  const { posts, loading: postsLoading } = useUserPosts(userId);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const loading = userLoading || postsLoading;
  
  return {
    user,
    posts,
    loading,
    isMobile,
  };
}
```

---

## Hook Rules

### ✅ Do

- Call hooks at the top level
- Call hooks from React functions
- Use descriptive names (prefix with `use`)
- Return stable references (useCallback, useMemo)

### ❌ Don't

- Call hooks inside loops
- Call hooks inside conditions
- Call hooks from regular functions
- Return unstable references
