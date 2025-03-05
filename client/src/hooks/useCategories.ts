import { useQuery } from '@tanstack/react-query';

interface Category {
  id: number;
  name: string;
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      return response.json();
    },
  });
}
