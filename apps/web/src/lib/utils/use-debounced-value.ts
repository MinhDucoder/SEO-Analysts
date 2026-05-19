"use client";

import * as React from "react";

/**
 * Returns a value that lags the input by `delay` milliseconds. Used to
 * throttle network calls driven by free-text inputs.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
