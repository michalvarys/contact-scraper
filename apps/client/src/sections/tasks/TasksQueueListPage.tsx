"use client";

import { useState } from "react";
import { trpc } from "@/trpc/trpc";
import { Plus } from "lucide-react";
import { ScraperTaskStatus } from "@/types/scraper";
import Button from "@/components/atoms/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/molecules/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import TasksTable from "@/components/molecules/TasksTable";
import CreateTaskForm from "./components/CreateTaskForm";

/**
 * Stránka pro správu fronty scraperů
 */
const ScraperQueuePage = () => {
    const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Získání dat o úlohách
    const { data: tasks, isLoading, refetch } = trpc.scraper.getTasks.useQuery({
        status: currentStatus as any,
    }, {
        refetchInterval: 10000, // Automatické obnovení každých 10 sekund
    });

    return (
        <div className="container-fluid w-full py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Správa fronty scraperů</h1>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Vytvořit novou úlohu
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] w-full md:max-w-[100vw]">
                        <DialogHeader>
                            <DialogTitle>Vytvořit novou úlohu scraperu</DialogTitle>
                            <DialogDescription>
                                Vytvořte novou úlohu pro scraper. Zadejte typ scraperu, průmysl, region a další parametry.
                            </DialogDescription>
                        </DialogHeader>
                        <CreateTaskForm onSuccess={() => {
                            setIsCreateDialogOpen(false);
                            refetch();
                        }} />
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full" onValueChange={(value) => {
                setCurrentStatus(value === "all" ? undefined : value);
            }}>
                <TabsList className="grid grid-cols-6 mb-8">
                    <TabsTrigger value="all">Všechny</TabsTrigger>
                    <TabsTrigger value={ScraperTaskStatus.PENDING}>Čekající</TabsTrigger>
                    <TabsTrigger value={ScraperTaskStatus.RUNNING}>Běžící</TabsTrigger>
                    <TabsTrigger value={ScraperTaskStatus.COMPLETED}>Dokončené</TabsTrigger>
                    <TabsTrigger value={ScraperTaskStatus.PAUSED}>Pozastavené</TabsTrigger>
                    <TabsTrigger value={ScraperTaskStatus.FAILED}>Selhané</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
                <TabsContent value={ScraperTaskStatus.PENDING} className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
                <TabsContent value={ScraperTaskStatus.RUNNING} className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
                <TabsContent value={ScraperTaskStatus.COMPLETED} className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
                <TabsContent value={ScraperTaskStatus.PAUSED} className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
                <TabsContent value={ScraperTaskStatus.FAILED} className="mt-0">
                    <TasksTable tasks={tasks || []} isLoading={isLoading} onRefresh={refetch} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ScraperQueuePage;
