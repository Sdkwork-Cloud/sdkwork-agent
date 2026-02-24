// Custom Hook Template
// Use this template for creating reusable hooks

import { useState, useCallback, useEffect } from 'react';

// ============================================
// Types
// ============================================

interface UseHookNameOptions {
  /** Configuration option */
  option1?: boolean;
  /** Another option */
  option2?: number;
}

interface UseHookNameReturn {
  /** Current value */
  value: string;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Action function */
  doSomething: (param: string) => void;
  /** Reset function */
  reset: () => void;
}

// ============================================
// Hook
// ============================================

export function useHookName(
  initialValue: string,
  options: UseHookNameOptions = {}
): UseHookNameReturn {
  const { option1 = false, option2 = 100 } = options;

  // State
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Actions
  const doSomething = useCallback((param: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Do something with param
      setValue(param);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsLoading(false);
  }, [initialValue]);

  // Effects
  useEffect(() => {
    // Cleanup or initialization
    return () => {
      // Cleanup
    };
  }, []);

  return {
    value,
    isLoading,
    error,
    doSomething,
    reset,
  };
}

// ============================================
// Usage Example
// ============================================

/*
function MyComponent() {
  const { value, isLoading, doSomething } = useHookName('initial', {
    option1: true,
  });

  return (
    <div>
      {isLoading ? 'Loading...' : value}
      <button onClick={() => doSomething('new value')}>
        Update
      </button>
    </div>
  );
}
*/
