"use server";
import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import ScraperQueuePage from "@/pages/tasks/TasksQueueListPage";

export default async function TasksListPage() {
    const helpers = await createSSRHelper()
    await helpers.scraper.getTasks.prefetch({ status: undefined });

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <ScraperQueuePage />
        </Hydrate>
    );

}