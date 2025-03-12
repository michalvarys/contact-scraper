"use server"
import { Suspense } from "react";
import TaskDetail from "@/pages/tasks/TaskDetailPage";
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
    const { id } = await params
    return (
        <Suspense fallback={
            <div className="container py-10 flex items-center justify-center min-h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <TaskDetail taskId={id} />
        </Suspense>
    );
}
