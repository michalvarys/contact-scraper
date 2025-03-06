import { useQuery } from '@tanstack/react-query';

interface Industry {
  id: number;
  name: string;
}

export function useIndustries() {
  return useQuery<Industry[]>({
    queryKey: ['industries'],
    queryFn: async () => {
      const response = await fetch('/api/industries');

      if (!response.ok) {
        throw new Error('Failed to fetch industries');
      }

      return response.json();
    },
  });
}
