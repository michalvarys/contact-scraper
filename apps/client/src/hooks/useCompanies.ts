import { trpc } from '@/trpc/trpc';
import { FiltersType } from './useFilters';

export function useCompanies(params: FiltersType) {
  return trpc.company.getCompanies.useQuery(params, {
    retry(failureCount, error) {
      return failureCount < 3;
    },
  });
}
