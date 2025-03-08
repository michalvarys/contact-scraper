import { trpc } from '@/trpc/trpc';

export function useCompanies(params: Record<string, string>) {
  return trpc.company.getCompanies.useQuery(params, {
    retry(failureCount, error) {
      return failureCount < 3;
    },
  });
}
