import { useQuery } from '@tanstack/react-query';
import { Business } from '@/types/business';

interface ApiResponse {
  data: Business[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function useCompanies(params: Record<string, string>) {
  return useQuery<ApiResponse, Error>({
    queryKey: ['companies', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`/api/companies?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      return response.json();
    },
  });
}
