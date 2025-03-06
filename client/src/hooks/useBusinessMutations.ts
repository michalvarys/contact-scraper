// src/hooks/useBusinessMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Business } from '@/types/business';

interface UpdateBusinessResponse {
  success: boolean;
  data?: Business;
  message?: string;
}

interface DeleteBusinessResponse {
  success: boolean;
  message?: string;
}

interface BulkUpdateCategoryResponse {
  success: boolean;
  count: number;
  message?: string;
}

interface BulkDeleteResponse {
  success: boolean;
  count: number;
  message?: string;
}

export function useBusinessMutations() {
  const queryClient = useQueryClient();

  // Aktualizace firmy
  const updateBusiness = useMutation<UpdateBusinessResponse, Error, Business>({
    mutationFn: async (business: Business) => {
      const response = await fetch(`/api/companies/${business.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(business),
      });

      if (!response.ok) {
        throw new Error('Failed to update business');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidace cache pro opětovné načtení dat
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // Smazání firmy
  const deleteBusiness = useMutation<DeleteBusinessResponse, Error, string>({
    mutationFn: async (businessId: string) => {
      const response = await fetch(`/api/companies/${businessId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete business');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // Hromadná aktualizace kategorie
  const bulkUpdateCategory = useMutation<
    BulkUpdateCategoryResponse,
    Error,
    { businessIds: string[]; categoryId: number }
  >({
    mutationFn: async ({ businessIds, categoryId }) => {
      const response = await fetch('/api/companies/bulk-update-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessIds, categoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update categories');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // Hromadné mazání
  const bulkDelete = useMutation<BulkDeleteResponse, Error, string[]>({
    mutationFn: async (businessIds: string[]) => {
      const response = await fetch('/api/companies/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete businesses');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  return {
    updateBusiness,
    deleteBusiness,
    bulkUpdateCategory,
    bulkDelete,
  };
}
