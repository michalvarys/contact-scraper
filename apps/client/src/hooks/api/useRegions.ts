import { trpc } from '@/trpc/trpc';

export function useRegions() {
  return trpc.company.getRegions.useQuery();
}
