"use client";
import { useMemo, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { trpc } from "@/trpc/trpc";
import { useTaskDetail, useTaskLinks, useTaskLogs } from "./hooks";
import { TaskDetailHeader } from "./components/TaskDetailHeader";
import { TaskDetailStats } from "./components/TaskDetailStats";
import { TaskDetailLinks } from "./components/TaskDetailLinks";
import { TaskDetailInfo } from "./components/TaskDetailInfo";
import { TaskDetailLogs } from "./components/TaskDetailLogs";

interface TaskDetailProps {
    taskId: string;
}

/**
 * Komponenta pro detail úlohy scraperu
 */
const TaskDetail = ({ taskId }: TaskDetailProps) => {
    const [activeTab, setActiveTab] = useState("info");
    const router = useRouter();

    const { data: tasks } = trpc.scraper.getTasks.useQuery({});

    const { prevTaskId, nextTaskId } = useMemo(() => {
        if (!tasks || tasks.length === 0) return { prevTaskId: null, nextTaskId: null };
        const idx = tasks.findIndex((t: any) => t.id === taskId);
        if (idx === -1) return { prevTaskId: null, nextTaskId: null };
        return {
            prevTaskId: idx > 0 ? tasks[idx - 1].id : null,
            nextTaskId: idx < tasks.length - 1 ? tasks[idx + 1].id : null,
        };
    }, [tasks, taskId]);

    const {
        task,
        isLoading,
        runTask,
        pauseTask,
        retryFailedLinks,
        updateConfig,
        handleDuplicate,
        deleteTask,
        isRunning,
        isPausing,
        isRetrying,
        isUpdatingConfig,
        isDeleting
    } = useTaskDetail(taskId);

    const {
        links,
        addLinkForm,
        showAddLinkForm,
        toggleAddLinkForm,
        onAddLinkSubmit,
        processLink,
        isProcessingLink,
        isAddingLink,
        rescrapMissingCompanyLinks,
        isRescrapingMissingLinks,
        restartFailedLinks,
        isRestartingFailedLinks,
        invalidateLinks,
        isInvalidating,
    } = useTaskLinks(taskId);

    const { logs } = useTaskLogs(taskId);

    if (isLoading) {
        return (
            <div className="container py-10 flex items-center justify-center min-h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="container py-10">
                <div className="mt-8 text-center">
                    <h1 className="text-2xl font-bold">Úloha nebyla nalezena</h1>
                    <p className="mt-2 text-muted-foreground">Úloha s ID {taskId} neexistuje nebo byla odstraněna.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-10 relative">
            {prevTaskId && (
                <button
                    onClick={() => router.push(`/scraper/${prevTaskId}`)}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-background/80 hover:bg-accent border border-border rounded-r-lg p-2 shadow-md transition-colors"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}
            {nextTaskId && (
                <button
                    onClick={() => router.push(`/scraper/${nextTaskId}`)}
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-background/80 hover:bg-accent border border-border rounded-l-lg p-2 shadow-md transition-colors"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            )}
            <TaskDetailHeader
                task={task}
                isRunning={isRunning}
                isPausing={isPausing}
                isRetrying={isRetrying}
                isDeleting={isDeleting}
                onRun={runTask}
                onPause={pauseTask}
                onRetryFailed={retryFailedLinks}
                onDuplicate={handleDuplicate}
                onDelete={deleteTask}
            />

            <TaskDetailStats task={task} links={links} />

            <Tabs defaultValue="info" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-8">
                    <TabsTrigger value="info">Informace</TabsTrigger>
                    <TabsTrigger value="links">Odkazy ({task.scrapedLinks.length})</TabsTrigger>
                    <TabsTrigger value="logs">Logy ({logs?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-0">
                    <TaskDetailInfo
                        task={task}
                        onUpdateConfig={updateConfig}
                        isUpdatingConfig={isUpdatingConfig}
                    />
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                    <TaskDetailLinks
                        task={task}
                        links={links}
                        showAddLinkForm={showAddLinkForm}
                        toggleAddLinkForm={toggleAddLinkForm}
                        addLinkForm={addLinkForm}
                        onAddLinkSubmit={onAddLinkSubmit}
                        isAddingLink={isAddingLink}
                        processLink={processLink}
                        isProcessingLink={isProcessingLink}
                        onBulkRescrape={rescrapMissingCompanyLinks}
                        isBulkRescraping={isRescrapingMissingLinks}
                        onRestartFailed={restartFailedLinks}
                        isRestartingFailed={isRestartingFailedLinks}
                        onInvalidateLinks={invalidateLinks}
                        isInvalidating={isInvalidating}
                    />
                </TabsContent>

                <TabsContent value="logs" className="mt-0">
                    <TaskDetailLogs logs={logs} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TaskDetail;
