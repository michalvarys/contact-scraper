import { useQuery } from '@tanstack/react-query';

interface Region {
  id: number;
  name: string;
}

export function useRegions() {
  return useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await fetch('/api/regions');

      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }

      return response.json();
    },
  });
}
