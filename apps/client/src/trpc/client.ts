// Tento soubor je nyní prázdný, protože QueryClient je vytvářen v provider.tsx
// Ponecháváme ho pro zpětnou kompatibilitu, ale v budoucnu by měl být odstraněn

import { QueryClient } from '@tanstack/react-query';

// Exportujeme funkci pro vytvoření QueryClient, kterou můžeme použít v provider.tsx
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 1000 } },
  });
}

// Pro zpětnou kompatibilitu
const queryClient = createQueryClient();
export default queryClient;
