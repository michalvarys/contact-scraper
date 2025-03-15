import React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { Loader2, Play, Pause, RefreshCw, Info } from "lucide-react";
import { trpc } from "@/trpc/trpc";
import { ScraperTask } from "@/types/scraper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/atoms/Table";
import { Card, CardContent } from "@/components/atoms/Card";
import Button from "@/components/atoms/Button";
import TaskStatusBadge from "@/sections/tasks/components/TaskStatusBadge";

export interface TasksTableProps {
    /**
     * Seznam úloh k zobrazení
     */
    tasks: any[];
    /**
     * Indikace načítání
     */
    isLoading: boolean;
    /**
     * Callback pro obnovení dat
     */
    onRefresh: () => void;
}

/**
 * Komponenta pro zobrazení tabulky úloh scraperu
 */
const TasksTable: React.FC<TasksTableProps> = ({ tasks, isLoading, onRefresh }) => {
    const router = useRouter();

    // Mutace pro spuštění, pozastavení a pokračování úloh
    const runTaskMutation = trpc.scraper.runTask.useMutation({
        onSuccess: () => onRefresh(),
    });

    const pauseTaskMutation = trpc.scraper.pauseTask.useMutation({
        onSuccess: () => onRefresh(),
    });

    const resumeTaskMutation = trpc.scraper.resumeTask.useMutation({
        onSuccess: () => onRefresh(),
    });

    const retryFailedLinksMutation = trpc.scraper.retryFailedLinks.useMutation({
        onSuccess: () => onRefresh(),
    });

    // Formátování data
    const formatDate = (date: string) => {
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!tasks || tasks.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Žádné úlohy nebyly nalezeny.</p>
                </CardContent>
            </Card>
        );
    }

    const handleShowDetail = (task: ScraperTask) => {
        router.push(`/scraper/${task.id}`);
    };

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead>Dotaz</TableHead>
                            <TableHead>Stav</TableHead>
                            <TableHead>Vytvořeno</TableHead>
                            <TableHead>Spuštěno</TableHead>
                            <TableHead>Dokončeno</TableHead>
                            <TableHead>Odkazy</TableHead>
                            <TableHead className="text-right">Akce</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {tasks.map((task) => (
                            <TableRow key={task.id} onDoubleClick={() => handleShowDetail(task)}>
                                <TableCell className="font-mono text-xs">
                                    {task.id.substring(0, 8)}...
                                </TableCell>
                                <TableCell>{task.scraperType}</TableCell>
                                <TableCell>{task.scraperConfig.searchQuery || `${task.scraperConfig.industry || ''} ${task.scraperConfig.region || ''}`}</TableCell>
                                <TableCell>
                                    <TaskStatusBadge status={task.status} />
                                </TableCell>
                                <TableCell>{task.createdAt ? formatDate(task.createdAt) : "-"}</TableCell>
                                <TableCell>{task.startedAt ? formatDate(task.startedAt) : "-"}</TableCell>
                                <TableCell>{task.completedAt ? formatDate(task.completedAt) : "-"}</TableCell>
                                <TableCell>
                                    {task.scrapedLinks?.length || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleShowDetail(task)}
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>

                                        {(task.status === "PENDING" || task.status === "FAILED" || task.status === "PAUSED") && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    if (task.status === "FAILED" || task.status === "PAUSED") {
                                                        resumeTaskMutation.mutate({ id: task.id });
                                                    } else {
                                                        runTaskMutation.mutate({ id: task.id });
                                                    }
                                                }}
                                                disabled={runTaskMutation.isLoading || resumeTaskMutation.isLoading}
                                            >
                                                {(runTaskMutation.isLoading || resumeTaskMutation.isLoading) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}

                                        {task.status === "RUNNING" && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => pauseTaskMutation.mutate({ id: task.id })}
                                                disabled={pauseTaskMutation.isLoading}
                                            >
                                                {pauseTaskMutation.isLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Pause className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}

                                        {task.status === "FAILED" && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => retryFailedLinksMutation.mutate({ taskId: task.id })}
                                                disabled={retryFailedLinksMutation.isLoading}
                                            >
                                                {retryFailedLinksMutation.isLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default TasksTable;
