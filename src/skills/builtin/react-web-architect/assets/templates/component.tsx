// Component Template - Standard Structure
// Use this template for creating new components

import { useState, useCallback } from 'react';

// ============================================
// Types
// ============================================

interface ComponentNameProps {
  /** Required prop description */
  requiredProp: string;
  /** Optional prop with default */
  optionalProp?: boolean;
  /** Callback prop */
  onAction?: (value: string) => void;
  /** Children */
  children?: React.ReactNode;
}

// ============================================
// Component
// ============================================

export function ComponentName({
  requiredProp,
  optionalProp = false,
  onAction,
  children,
}: ComponentNameProps) {
  // State
  const [localState, setLocalState] = useState<string>('');

  // Handlers
  const handleClick = useCallback(() => {
    onAction?.(localState);
  }, [localState, onAction]);

  // Effects
  // useEffect(() => {
  //   // Side effects here
  // }, [dependencies]);

  // Render
  return (
    <div className="component-name">
      <h2>{requiredProp}</h2>
      {optionalProp && <span>Optional content</span>}
      {children}
      <button onClick={handleClick}>
        Action
      </button>
    </div>
  );
}

// ============================================
// Sub-components (if needed)
// ============================================

// function SubComponent({ value }: { value: string }) {
//   return <div>{value}</div>;
// }

// ============================================
// Exports
// ============================================

export default ComponentName;
