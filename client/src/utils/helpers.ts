export function debounce(fn: () => void, ms = 500) {
  const timer = setTimeout(() => {
    fn();
  }, ms);

  //   return () => clearTimeout(timer);
  return timer;
}
