import { trpc } from '@/trpc/trpc';
import { useToast } from '@/hooks/ui/useToast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';

// Schéma pro validaci formuláře přidání odkazu
const addLinkFormSchema = z.object({
  link: z.string().url('Zadejte platnou URL adresu').min(1, 'Odkaz je povinný'),
});

export type AddLinkFormValues = z.infer<typeof addLinkFormSchema>;

export const useTaskLinks = (taskId: string) => {
  const { toast } = useToast();
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);

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

  return {
    links,
    addLinkForm,
    showAddLinkForm,
    toggleAddLinkForm,
    onAddLinkSubmit,
    processLink,
    isProcessingLink: processLinkMutation.isLoading,
    isAddingLink: addLinkMutation.isLoading,
  };
};
