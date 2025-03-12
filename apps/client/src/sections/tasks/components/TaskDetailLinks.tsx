import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/atoms/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/atoms/Table';
import Button from '@/components/atoms/Button';
import { Loader2, Play, Plus, X } from 'lucide-react';
import { ScraperTask, ScrapedLinkStatus } from '@/types/scraper';
import TaskStatusBadge from '@/components/molecules/TaskStatusBadge';
import { formatDate } from '../utils/date';
import { AddLinkForm } from './AddLinkForm';
import { UseFormReturn } from 'react-hook-form';
import { AddLinkFormValues } from '@/sections/tasks/hooks/useTaskLinks';

interface TaskDetailLinksProps {
    task: ScraperTask;
    links: any[] | undefined;
    showAddLinkForm: boolean;
    toggleAddLinkForm: () => void;
    addLinkForm: UseFormReturn<AddLinkFormValues>;
    onAddLinkSubmit: (values: AddLinkFormValues) => void;
    isAddingLink: boolean;
    processLink: (link: string) => void;
    isProcessingLink: boolean;
}

export const TaskDetailLinks: React.FC<TaskDetailLinksProps> = ({
    task,
    links,
    showAddLinkForm,
    toggleAddLinkForm,
    addLinkForm,
    onAddLinkSubmit,
    isAddingLink,
    processLink,
    isProcessingLink,
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Seznam odkazů</CardTitle>
                    <CardDescription>
                        Odkazy nalezené a zpracované scraperem
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAddLinkForm}
                >
                    {showAddLinkForm ? (
                        <>
                            <X className="mr-2 h-4 w-4" />
                            Zrušit
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            Přidat odkaz
                        </>
                    )}
                </Button>
            </CardHeader>
            {showAddLinkForm && (
                <CardContent className="border-b">
                    <AddLinkForm
                        form={addLinkForm}
                        onSubmit={onAddLinkSubmit}
                        isLoading={isAddingLink}
                    />
                </CardContent>
            )}
            <CardContent className="p-0">
                {task.scrapedLinks.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Žádné odkazy nebyly nalezeny.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Odkaz</TableHead>
                                <TableHead>Stav</TableHead>
                                <TableHead>Zpracováno</TableHead>
                                <TableHead>Akce</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {task.scrapedLinks.map((link) => (
                                <TableRow key={link.id}>
                                    <TableCell className="font-mono text-xs">
                                        {link.id.substring(0, 8)}...
                                    </TableCell>
                                    <TableCell className="max-w-sm truncate">
                                        <a
                                            href={link.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {link.link}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <TaskStatusBadge status={link.status} />
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(link.processedAt)}
                                    </TableCell>
                                    <TableCell>
                                        {(link.status === ScrapedLinkStatus.PENDING || link.status === ScrapedLinkStatus.FAILED) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => processLink(link.link)}
                                                disabled={isProcessingLink}
                                            >
                                                {isProcessingLink ? (
                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Play className="mr-2 h-3 w-3" />
                                                )}
                                                Zpracovat
                                            </Button>
                                        )}
                                        {link.status === ScrapedLinkStatus.PROCESSED && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled
                                            >
                                                Hotovo
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
