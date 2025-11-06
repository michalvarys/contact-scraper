"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
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

    // Použití hooků pro získání dat a funkcí
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
        isRestartingFailedLinks
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
        <div className="container-fluid py-10">
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
