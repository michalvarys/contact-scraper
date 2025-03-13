import { trpc } from '@/trpc/trpc';
import { useToast } from '@/hooks/ui/useToast';

export const useLinkData = (linkId: string | null) => {
  const { toast } = useToast();

  // Získání dat o linku
  const { data, isLoading, error, refetch } = trpc.scraper.getLinkData.useQuery(
    { linkId: linkId || '' },
    {
      enabled: !!linkId, // Dotaz se provede pouze pokud je linkId definováno
      onError: (error) => {
        toast({
          title: 'Chyba při načítání dat',
          description: error.message || 'Nastala neočekávaná chyba při načítání dat linku.',
          variant: 'destructive',
          duration: 5000,
        });
      },
    },
  );

  return {
    linkData: data,
    isLoading,
    error,
    refetch,
  };
};
