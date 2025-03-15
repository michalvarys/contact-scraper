"use server";
import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import ScraperQueuePage from "@/sections/tasks/TasksQueueListPage";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default async function TasksListPage() {
    const helpers = await createSSRHelper()
    await helpers.scraper.getTasks.prefetch({ status: undefined });

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <Suspense fallback={
                <div className="container py-10 flex items-center justify-center min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            }>
                <ScraperQueuePage />
            </Suspense>
        </Hydrate>
    );

}