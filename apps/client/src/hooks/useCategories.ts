import { trpc } from '@/trpc/trpc';

export function useCategories() {
  return trpc.company.getCategories.useQuery();
}
