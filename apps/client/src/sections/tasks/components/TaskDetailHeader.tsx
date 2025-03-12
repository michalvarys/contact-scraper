import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/atoms/Button';
import { ArrowLeft, Loader2, Play, Pause, RefreshCw } from 'lucide-react';
import TaskStatusBadge from '@/components/molecules/TaskStatusBadge';
import { ScraperTask, ScraperTaskStatus } from '@/types/scraper';

interface TaskDetailHeaderProps {
    task: ScraperTask;
    isRunning: boolean;
    isPausing: boolean;
    isRetrying: boolean;
    onRun: () => void;
    onPause: () => void;
    onRetryFailed: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
    task,
    isRunning,
    isPausing,
    isRetrying,
    onRun,
    onPause,
    onRetryFailed,
}) => {
    const router = useRouter();

    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.push('/scraper-queue')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zpět na seznam
                </Button>
                <h1 className="text-3xl font-bold">Detail úlohy</h1>
                <TaskStatusBadge status={task.status} />
            </div>
            <div className="flex gap-2">
                {(task.status === ScraperTaskStatus.PENDING ||
                    task.status === ScraperTaskStatus.FAILED ||
                    task.status === ScraperTaskStatus.PAUSED) && (
                        <Button variant="default" onClick={onRun} disabled={isRunning}>
                            {isRunning ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="mr-2 h-4 w-4" />
                            )}
                            {task.status === ScraperTaskStatus.PAUSED ? 'Pokračovat' : 'Spustit'}
                        </Button>
                    )}

                {task.status === ScraperTaskStatus.RUNNING && (
                    <Button variant="outline" onClick={onPause} disabled={isPausing}>
                        {isPausing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Pause className="mr-2 h-4 w-4" />
                        )}
                        Pozastavit
                    </Button>
                )}

                {task.status === ScraperTaskStatus.FAILED && (
                    <Button variant="outline" onClick={onRetryFailed} disabled={isRetrying}>
                        {isRetrying ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Opakovat selhané
                    </Button>
                )}
            </div>
        </div>
    );
};
