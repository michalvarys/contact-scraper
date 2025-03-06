import { trpc } from '@/trpc/trpc';

export function useIndustries() {
  return trpc.company.getIndustries.useQuery();
}
