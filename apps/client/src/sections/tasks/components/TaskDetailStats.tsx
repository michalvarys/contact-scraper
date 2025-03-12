import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/atoms/Card';
import Badge from '@/components/atoms/Badge';
import { Clock, Play, Eye } from 'lucide-react';
import { ScraperTask, ScrapedLinkStatus } from '@/types/scraper';
import { getLinkCountByStatus } from '../utils/link';
import { formatDate } from '../utils/date';

interface TaskDetailStatsProps {
    task: ScraperTask;
    links: any[] | undefined;
}

export const TaskDetailStats: React.FC<TaskDetailStatsProps> = ({ task, links }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Typ scraperu</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{task.scraperType}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Počet odkazů</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{task.scrapedLinks.length}</p>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            {getLinkCountByStatus(links, ScrapedLinkStatus.PENDING)} čekajících
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            {getLinkCountByStatus(links, ScrapedLinkStatus.PROCESSED)} zpracovaných
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            {getLinkCountByStatus(links, ScrapedLinkStatus.FAILED)} selhalo
                        </Badge>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Časy</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Vytvořeno:</span>
                            <span className="ml-auto">{formatDate(task.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                            <Play className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Spuštěno:</span>
                            <span className="ml-auto">{formatDate(task.startedAt)}</span>
                        </div>
                        <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Dokončeno:</span>
                            <span className="ml-auto">{formatDate(task.completedAt)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
