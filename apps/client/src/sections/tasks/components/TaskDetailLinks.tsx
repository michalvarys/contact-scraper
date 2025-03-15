import React, { useState, useMemo } from 'react';
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
import { Loader2, Play, Plus, X, Eye, Filter } from 'lucide-react';
import { ScraperTask, ScrapedLinkStatus } from '@/types/scraper';
import TaskStatusBadge from '@/sections/tasks/components/TaskStatusBadge';
import { formatDate } from '../utils/date';
import { AddLinkForm } from './AddLinkForm';
import { UseFormReturn } from 'react-hook-form';
import { AddLinkFormValues } from '@/sections/tasks/hooks/useTaskLinks';
import { LinkDataDialog } from './LinkDataDialog';
import CustomSelect from '@/components/molecules/CustomSelect';

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
    // Stav pro sledování vybraného linku pro zobrazení dat
    const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
    const [showLinkData, setShowLinkData] = useState(false);

    // Stav pro filtrování podle stavů - pole vybraných stavů
    const [statusFilters, setStatusFilters] = useState<string[]>([]);

    // Funkce pro otevření dialogu s daty linku
    const handleViewLinkData = (linkId: string) => {
        setSelectedLinkId(linkId);
        setShowLinkData(true);
    };

    // Funkce pro zavření dialogu
    const handleCloseLinkData = () => {
        setShowLinkData(false);
    };

    // Filtrování odkazů podle vybraných stavů
    const filteredLinks = useMemo(() => {
        if (!links) return [];
        if (statusFilters.length === 0) {
            return links;
        }
        return links.filter(link => statusFilters.includes(link.status));
    }, [links, statusFilters]);

    // Možnosti pro filtrování podle stavu
    const statusOptions = useMemo(() => [
        { id: ScrapedLinkStatus.PENDING, value: ScrapedLinkStatus.PENDING, label: 'Čekající' },
        { id: ScrapedLinkStatus.RUNNING, value: ScrapedLinkStatus.RUNNING, label: 'Zpracovávané' },
        { id: ScrapedLinkStatus.PROCESSED, value: ScrapedLinkStatus.PROCESSED, label: 'Zpracované' },
        { id: ScrapedLinkStatus.FAILED, value: ScrapedLinkStatus.FAILED, label: 'Selhané' },
        { id: ScrapedLinkStatus.SKIPPED, value: ScrapedLinkStatus.SKIPPED, label: 'Přeskočené' },
    ], []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Seznam odkazů</CardTitle>
                    <CardDescription>
                        Odkazy nalezené a zpracované scraperem
                    </CardDescription>
                </div>
                <div className="flex gap-2">

                    <Button
                        variant="outline"
                        size="lg"
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
                    {/* Filtrování podle stavu */}
                    <div className="flex items-center">
                        <CustomSelect
                            placeholder="Filtrovat podle stavu"
                            className="min-w-[200px]"
                            multiple
                            value={statusFilters}
                            options={statusOptions}
                            onChange={(values) => setStatusFilters(values as string[])}
                        />
                        <Filter className="ml-2 h-4 w-4 text-gray-500" />
                    </div>
                </div>
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
                {!links || links.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Žádné odkazy nebyly nalezeny.</p>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Žádné odkazy neodpovídají vybranému filtru.</p>
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
                            {filteredLinks.map((link) => (
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
                                            {/* Zobrazíme jméno firmy, pokud existuje, jinak odkaz */}
                                            {link.company ? (
                                                <span className="font-semibold">{link.company.name}</span>
                                            ) : (
                                                link.link
                                            )}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <TaskStatusBadge status={link.status} />
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(link.processedAt)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
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
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewLinkData(link.id)}
                                                    >
                                                        <Eye className="mr-2 h-3 w-3" />
                                                        Zobrazit data
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Dialog pro zobrazení scrapnutých dat */}
            <LinkDataDialog
                linkId={selectedLinkId}
                isOpen={showLinkData}
                onClose={handleCloseLinkData}
            />
        </Card>
    );
};
