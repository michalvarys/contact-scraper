import { trpc } from '@/trpc/trpc';
import { useToast } from '@/hooks/ui/useToast';
import { useState } from 'react';

export const useLinkData = (linkId: string | null) => {
  const { toast } = useToast();
  const [isRescrapingLink, setIsRescrapingLink] = useState(false);

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

  // Mutace pro znovuspuštění scrapování
  const rescrapLinkMutation = trpc.scraper.rescrapLink.useMutation({
    onMutate: () => {
      setIsRescrapingLink(true);
    },
    onSuccess: () => {
      toast({
        title: 'Scrapování znovu spuštěno',
        description: 'Odkaz byl úspěšně zařazen do fronty ke zpracování.',
        variant: 'success',
        duration: 5000,
      });
      refetch(); // Aktualizujeme data po úspěšném znovuspuštění
    },
    onError: (error) => {
      toast({
        title: 'Chyba při znovuspuštění scrapování',
        description: error.message || 'Nastala neočekávaná chyba při znovuspuštění scrapování.',
        variant: 'destructive',
        duration: 5000,
      });
    },
    onSettled: () => {
      setIsRescrapingLink(false);
    },
  });

  // Funkce pro znovuspuštění scrapování
  const rescrapLink = () => {
    if (!linkId) return;
    rescrapLinkMutation.mutate({ linkId });
  };

  return {
    linkData: data,
    isLoading,
    error,
    refetch,
    rescrapLink,
    isRescrapingLink,
  };
};
