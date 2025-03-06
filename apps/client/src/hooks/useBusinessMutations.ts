// src/hooks/useBusinessMutations.ts
import { trpc } from '@/trpc/trpc';

export function useBusinessMutations() {
  const utils = trpc.useContext();

  // Aktualizace firmy
  const updateBusiness = trpc.company.updateCompany.useMutation({
    onSuccess: () => {
      // Invalidace cache pro opětovné načtení dat
      utils.company.getCompanies.invalidate();
    },
  });

  // Smazání firmy
  const deleteBusiness = trpc.company.deleteCompany.useMutation({
    onSuccess: () => {
      utils.company.getCompanies.invalidate();
    },
  });

  // Hromadná aktualizace kategorie
  const bulkUpdateCategory = trpc.company.bulkUpdateCategory.useMutation({
    onSuccess: () => {
      utils.company.getCompanies.invalidate();
    },
  });

  // Hromadné mazání
  const bulkDelete = trpc.company.bulkDelete.useMutation({
    onSuccess: () => {
      utils.company.getCompanies.invalidate();
    },
  });

  return {
    updateBusiness,
    deleteBusiness,
    bulkUpdateCategory,
    bulkDelete,
  };
}
