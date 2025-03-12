import React from "react";
import Badge from "@/components/atoms/Badge";
import { ScraperTaskStatus } from "@/types/scraper";

export interface TaskStatusBadgeProps {
    /**
     * Stav úlohy
     */
    status: ScraperTaskStatus;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Komponenta pro zobrazení statusu úlohy v podobě Badge s barevným odlišením
 */
const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, className }) => {
    // Mapování stavu na variantu pro Badge
    const statusVariantMap: Record<ScraperTaskStatus, "default" | "success" | "warning" | "danger" | "info"> = {
        [ScraperTaskStatus.PENDING]: "warning",
        [ScraperTaskStatus.RUNNING]: "info",
        [ScraperTaskStatus.COMPLETED]: "success",
        [ScraperTaskStatus.FAILED]: "danger",
        [ScraperTaskStatus.PAUSED]: "warning",
    };

    return (
        <Badge variant={statusVariantMap[status]} className={className}>
            {status}
        </Badge>
    );
};

export default TaskStatusBadge;
