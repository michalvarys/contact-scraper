import { trpc } from '@/trpc/trpc';
import { useToast } from '@/hooks/ui/useToast';
import { ScraperTaskStatus } from '@/types/scraper';

export const useTaskDetail = (taskId: string) => {
  const { toast } = useToast();

  // Získání dat o úloze
  const {
    data: task,
    isLoading,
    refetch,
  } = trpc.scraper.getTask.useQuery(
    { id: taskId },
    {
      refetchInterval: 5000, // Automatické obnovení každých 5 sekund
    },
  );

  // Mutace pro akce
  const runTaskMutation = trpc.scraper.runTask.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Úloha spuštěna',
        description: `Úloha byla úspěšně spuštěna.`,
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při spuštění úlohy',
        description: error.message || 'Nastala neočekávaná chyba při spuštění úlohy.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const pauseTaskMutation = trpc.scraper.pauseTask.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Úloha pozastavena',
        description: `Úloha byla úspěšně pozastavena.`,
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při pozastavení úlohy',
        description: error.message || 'Nastala neočekávaná chyba při pozastavení úlohy.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const resumeTaskMutation = trpc.scraper.resumeTask.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Úloha spuštěna',
        description: `Úloha byla opětovně spuštěna.`,
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při opětovném spuštění úlohy',
        description: error.message || 'Nastala neočekávaná chyba při opětovném spuštění úlohy.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const retryFailedLinksMutation = trpc.scraper.retryFailedLinks.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Opakování selhavších odkazů',
        description: 'Selhavší odkazy byly úspěšně zařazeny do fronty pro opětovné zpracování.',
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při opakování selhavších odkazů',
        description: error.message || 'Nastala neočekávaná chyba při opakování selhavších odkazů.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  // Aktualizace konfigurace
  const updateConfigMutation = trpc.scraper.updateTaskConfig.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Nastavení upraveno',
        description: `Nastavení úlohy bylo úspěšně uloženo.`,
        variant: 'success',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba při úpravě nastavení',
        description: error.message || 'Nastala neočekávaná chyba při úpravě nastavení.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  // Funkce pro spuštění úlohy
  const runTask = () => {
    if (!task) return;

    if (task.status === ScraperTaskStatus.FAILED || task.status === ScraperTaskStatus.PAUSED) {
      resumeTaskMutation.mutate({ id: task.id });
    } else {
      runTaskMutation.mutate({ id: task.id });
    }
  };

  // Funkce pro pozastavení úlohy
  const pauseTask = () => {
    if (!task) return;
    pauseTaskMutation.mutate({ id: task.id });
  };

  // Funkce pro opakování selhavších odkazů
  const retryFailedLinks = () => {
    if (!task) return;
    retryFailedLinksMutation.mutate({ taskId: task.id });
  };

  // Funkce pro aktualizaci konfigurace
  const updateConfig = (config: Record<string, any>) => {
    if (!task) return;
    updateConfigMutation.mutate({
      taskId: task.id,
      config,
    });
  };

  return {
    task,
    isLoading,
    refetch,
    runTask,
    pauseTask,
    retryFailedLinks,
    updateConfig,
    isRunning: runTaskMutation.isLoading || resumeTaskMutation.isLoading,
    isPausing: pauseTaskMutation.isLoading,
    isRetrying: retryFailedLinksMutation.isLoading,
    isUpdatingConfig: updateConfigMutation.isLoading,
  };
};
