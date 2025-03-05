import { useEffect } from 'react';

export function useDebounce(fn: () => void, ms = 500, dependencies: any[] = []) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fn();
    }, ms);

    return () => clearTimeout(timer);
  }, dependencies);
}
