import { trpc } from '@/trpc/trpc';

export const useTaskLogs = (taskId: string) => {
  // Získání logů úlohy
  const { data: logs } = trpc.scraper.getTaskLogs.useQuery({ taskId });

  return {
    logs,
  };
};
