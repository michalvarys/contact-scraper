import { trpc } from '@/trpc/trpc';
import { useToast } from '@/hooks/ui/useToast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { ScrapedLinkStatus } from '@/types/scraper';

// Schéma pro validaci formuláře přidání odkazu
const addLinkFormSchema = z.object({
  link: z.string().url('Zadejte platnou URL adresu').min(1, 'Odkaz je povinný'),
});

export type AddLinkFormValues = z.infer<typeof addLinkFormSchema>;

export const useTaskLinks = (taskId: string) => {
  const { toast } = useToast();
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [isRescrapingMissingLinks, setIsRescrapingMissingLinks] = useState(false);
  const [isRestartingFailedLinks, setIsRestartingFailedLinks] = useState(false);

  // Získání odkazů úlohy
  const { data: links, refetch } = trpc.scraper.getTaskLinks.useQuery({ taskId });

  // Formulář pro přidání odkazu
  const addLinkForm = useForm<AddLinkFormValues>({
    resolver: zodResolver(addLinkFormSchema),
    defaultValues: {
      link: '',
    },
  });

  // Zpracování odkazu
  const processLinkMutation = trpc.scraper.processLink.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Odkaz zpracován',
        description: 'Odkaz byl úspěšně zpracován.',
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při zpracování odkazu',
        description: error.message || 'Nastala neočekávaná chyba při zpracování odkazu.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  // Přidání nového odkazu
  const addLinkMutation = trpc.scraper.addLink.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Odkaz přidán',
        description: 'Nový odkaz byl úspěšně přidán do fronty ke zpracování.',
        variant: 'success',
        duration: 5000,
      });
      addLinkForm.reset();
      setShowAddLinkForm(false);
    },
    onError: (error) => {
      toast({
        title: 'Chyba při přidání odkazu',
        description: error.message || 'Nastala neočekávaná chyba při přidání odkazu.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const rescrapLinkMutation = trpc.scraper.rescrapLink.useMutation();

  // Funkce pro zpracování odkazu
  const processLink = (link: string) => {
    processLinkMutation.mutate({
      taskId,
      link,
    });
  };

  // Odeslání formuláře pro přidání odkazu
  const onAddLinkSubmit = (values: AddLinkFormValues) => {
    addLinkMutation.mutate({
      taskId,
      link: values.link,
    });
  };

  // Přepínání zobrazení formuláře
  const toggleAddLinkForm = () => {
    setShowAddLinkForm(!showAddLinkForm);
  };

  const rescrapMissingCompanyLinks = async () => {
    if (!links || links.length === 0) {
      toast({
        title: 'Žádné odkazy k rescrapování',
        description: 'Pro tuto úlohu zatím nejsou dostupné žádné odkazy.',
        duration: 4000,
      });
      return;
    }

    const targets = links.filter(
      (link) => link.status === ScrapedLinkStatus.PROCESSED && !link.company,
    );

    if (targets.length === 0) {
      toast({
        title: 'Všechno hotovo',
        description: 'Všechny zpracované odkazy už mají přiřazená data.',
        duration: 4000,
      });
      return;
    }

    setIsRescrapingMissingLinks(true);

    const failed: { id: string; message: string }[] = [];

    try {
      for (const link of targets) {
        try {
          await rescrapLinkMutation.mutateAsync({ linkId: link.id });
        } catch (error: any) {
          const message = error instanceof Error ? error.message : error?.message || 'Neznámá chyba';
          failed.push({
            id: link.id,
            message,
          });
        }
      }

      await refetch();

      if (failed.length === 0) {
        toast({
          title: 'Scrapování znovu spuštěno',
          description: `${targets.length} odkazů bylo znovu zařazeno do fronty ke zpracování.`,
          variant: 'success',
          duration: 5000,
        });
      } else if (failed.length === targets.length) {
        toast({
          title: 'Scrapování se nepodařilo znovu spustit',
          description: 'Žádný z vybraných odkazů nebyl úspěšně znovu zpracován.',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Scrapování částečně znovu spuštěno',
          description: `Úspěšně znovu spuštěno: ${targets.length - failed.length}, neúspěšné: ${failed.length}.`,
          duration: 5000,
        });
      }
    } finally {
      setIsRescrapingMissingLinks(false);
    }
  };

  const restartFailedLinks = async () => {
    if (!links || links.length === 0) {
      toast({
        title: 'Žádné odkazy k restartu',
        description: 'Pro tuto úlohu zatím nejsou dostupné žádné odkazy.',
        duration: 4000,
      });
      return;
    }

    const targets = links.filter((link) => link.status === ScrapedLinkStatus.FAILED);

    if (targets.length === 0) {
      toast({
        title: 'Žádné selhané odkazy',
        description: 'Všechny odkazy byly zpracovány úspěšně.',
        duration: 4000,
      });
      return;
    }

    setIsRestartingFailedLinks(true);

    const failed: { id: string; message: string }[] = [];

    try {
      for (const link of targets) {
        try {
          await rescrapLinkMutation.mutateAsync({ linkId: link.id });
        } catch (error: any) {
          const message = error instanceof Error ? error.message : error?.message || 'Neznámá chyba';
          failed.push({ id: link.id, message });
        }
      }

      await refetch();

      if (failed.length === 0) {
        toast({
          title: 'Selhané odkazy restartovány',
          description: `${targets.length} odkazů bylo znovu zařazeno ke zpracování.`,
          variant: 'success',
          duration: 5000,
        });
      } else if (failed.length === targets.length) {
        toast({
          title: 'Restart selhaných odkazů selhal',
          description: 'Žádný ze selhaných odkazů se nepodařilo restartovat.',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Restart selhaných odkazů částečně úspěšný',
          description: `Úspěšně restartováno: ${targets.length - failed.length}, neúspěšné: ${failed.length}.`,
          duration: 5000,
        });
      }
    } finally {
      setIsRestartingFailedLinks(false);
    }
  };

  return {
    links,
    addLinkForm,
    showAddLinkForm,
    toggleAddLinkForm,
    onAddLinkSubmit,
    processLink,
    isProcessingLink: processLinkMutation.isLoading,
    isAddingLink: addLinkMutation.isLoading,
    rescrapMissingCompanyLinks,
    isRescrapingMissingLinks,
    restartFailedLinks,
    isRestartingFailedLinks,
  };
};
