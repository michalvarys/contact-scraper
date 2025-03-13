import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/atoms/Button';
import ConfirmButton from '@/components/atoms/ConfirmButton';
import { ArrowLeft, Loader2, Play, Pause, RefreshCw, Trash2 } from 'lucide-react';
import TaskStatusBadge from '@/components/molecules/TaskStatusBadge';
import { ScraperTask, ScraperTaskStatus } from '@/types/scraper';

interface TaskDetailHeaderProps {
    task: ScraperTask;
    isRunning: boolean;
    isPausing: boolean;
    isRetrying: boolean;
    isDeleting?: boolean;
    onRun: () => void;
    onPause: () => void;
    onRetryFailed: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
    task,
    isRunning,
    isPausing,
    isRetrying,
    isDeleting,
    onRun,
    onPause,
    onRetryFailed,
    onDuplicate,
    onDelete
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
                {/* Tlačítko pro smazání úlohy - vždy viditelné */}
                <ConfirmButton
                    variant="outline"
                    className="text-red-300 hover:bg-red-600 hover:text-white border-red-400"
                    onConfirm={onDelete}
                    confirmTitle="Smazat úlohu"
                    confirmDescription="Opravdu chcete smazat tuto úlohu? Tato akce je nevratná a smaže všechny související odkazy a logy."
                    confirmButtonText="Smazat"
                    confirmButtonVariant="destructive"
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Smazat úlohu
                </ConfirmButton>

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

                {task.status === ScraperTaskStatus.COMPLETED && (
                    <Button
                        variant="outline"
                        className='bg-yellow-300 text-black hover:bg-yellow-600 hover:text-white border-yellow-400'
                        onClick={onDuplicate}
                    >
                        <Play className="mr-2 h-4 w-4" />
                        Duplikovat a spustit
                    </Button>
                )}
            </div>
        </div>
    );
};
