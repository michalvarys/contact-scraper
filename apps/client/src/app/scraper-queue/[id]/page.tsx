"use server"
import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import TaskDetail from "@/sections/tasks/TaskDetailPage";
import { Loader2 } from "lucide-react";

interface TaskDetailPageProps {
    params: {
        id: string;
    };
}

/**
 * Stránka pro detail úlohy scraperu
 */
export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
    const helpers = await createSSRHelper()
    const { id } = await params
    await helpers.scraper.getTask.prefetch({ id })
    await helpers.scraper.getTaskLogs.prefetch({ taskId: id })
    await helpers.scraper.getTaskLinks.prefetch({ taskId: id })

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <Suspense fallback={
                <div className="container py-10 flex items-center justify-center min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            }>
                <TaskDetail taskId={id} />
            </Suspense>
        </Hydrate>
    );
}
