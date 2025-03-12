"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/atoms/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/atoms/Table";
import Badge from "@/components/atoms/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { ArrowLeft, Loader2, Play, Pause, RefreshCw, Eye, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/trpc/trpc";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import TaskStatusBadge from "@/components/molecules/TaskStatusBadge";

interface TaskDetailProps {
    taskId: string;
}

/**
 * Komponenta pro detail úlohy scraperu
 */
const TaskDetail = ({ taskId }: TaskDetailProps) => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("info");

    // Získání dat o úloze
    const { data: task, isLoading, refetch } = trpc.scraper.getTask.useQuery(
        { id: taskId },
        {
            refetchInterval: 5000, // Automatické obnovení každých 5 sekund
        }
    );

    // Získání odkazů a logů úlohy
    const { data: links } = trpc.scraper.getTaskLinks.useQuery({ taskId });
    const { data: logs } = trpc.scraper.getTaskLogs.useQuery({ taskId });

    // Mutace pro akce
    const runTaskMutation = trpc.scraper.runTask.useMutation({
        onSuccess: () => refetch(),
    });

    const pauseTaskMutation = trpc.scraper.pauseTask.useMutation({
        onSuccess: () => refetch(),
    });

    const resumeTaskMutation = trpc.scraper.resumeTask.useMutation({
        onSuccess: () => refetch(),
    });

    const retryFailedLinksMutation = trpc.scraper.retryFailedLinks.useMutation({
        onSuccess: () => refetch(),
    });

    // Zpracování odkazu
    const processLinkMutation = trpc.scraper.processLink.useMutation({
        onSuccess: () => refetch(),
    });

    // Formátování data
    const formatDate = (date: string | null | undefined) => {
        if (!date) return "-";
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
    };

    // Získání počtu odkazů podle stavu
    const getLinkCountByStatus = (status: string) => {
        if (!links) return 0;
        return links.filter(link => link.status === status).length;
    };

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
                <Button variant="outline" onClick={() => router.push('/scraper-queue')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zpět na seznam
                </Button>
                <div className="mt-8 text-center">
                    <h1 className="text-2xl font-bold">Úloha nebyla nalezena</h1>
                    <p className="mt-2 text-muted-foreground">Úloha s ID {taskId} neexistuje nebo byla odstraněna.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.push('/scraper-queue')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zpět na seznam
                    </Button>
                    <h1 className="text-3xl font-bold">Detail úlohy</h1>
                    <TaskStatusBadge status={task.status} />
                </div>
                <div className="flex gap-2">
                    {(task.status === "PENDING" || task.status === "FAILED" || task.status === "PAUSED") && (
                        <Button
                            variant="default"
                            onClick={() => {
                                if (task.status === "FAILED" || task.status === "PAUSED") {
                                    resumeTaskMutation.mutate({ id: task.id });
                                } else {
                                    runTaskMutation.mutate({ id: task.id });
                                }
                            }}
                            disabled={runTaskMutation.isLoading || resumeTaskMutation.isLoading}
                        >
                            {(runTaskMutation.isLoading || resumeTaskMutation.isLoading) ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="mr-2 h-4 w-4" />
                            )}
                            {task.status === "PAUSED" ? "Pokračovat" : "Spustit"}
                        </Button>
                    )}

                    {task.status === "RUNNING" && (
                        <Button
                            variant="outline"
                            onClick={() => pauseTaskMutation.mutate({ id: task.id })}
                            disabled={pauseTaskMutation.isLoading}
                        >
                            {pauseTaskMutation.isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Pause className="mr-2 h-4 w-4" />
                            )}
                            Pozastavit
                        </Button>
                    )}

                    {task.status === "FAILED" && (
                        <Button
                            variant="outline"
                            onClick={() => retryFailedLinksMutation.mutate({ taskId: task.id })}
                            disabled={retryFailedLinksMutation.isLoading}
                        >
                            {retryFailedLinksMutation.isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Opakovat selhané
                        </Button>
                    )}
                </div>
            </div>

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
                                {getLinkCountByStatus("PENDING")} čekajících
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                {getLinkCountByStatus("PROCESSED")} zpracovaných
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                {getLinkCountByStatus("FAILED")} selhalo
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

            <Tabs defaultValue="info" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-8">
                    <TabsTrigger value="info">Informace</TabsTrigger>
                    <TabsTrigger value="links">Odkazy ({task.scrapedLinks.length})</TabsTrigger>
                    <TabsTrigger value="logs">Logy ({logs?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detaily úlohy</CardTitle>
                            <CardDescription>
                                Podrobné informace o konfiguraci a parametrech úlohy
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium">Průmysl/obor</h3>
                                    <p className="text-muted-foreground">{task.industry || "-"}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Region</h3>
                                    <p className="text-muted-foreground">{task.region || "-"}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Vyhledávací dotaz</h3>
                                    <p className="text-muted-foreground">{task.searchQuery || "-"}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Konfigurace scraperu</h3>
                                    <pre className="p-4 bg-muted rounded-md overflow-auto mt-2 text-xs">
                                        {typeof task.scraperConfig === 'string'
                                            ? task.scraperConfig
                                            : JSON.stringify(task.scraperConfig, null, 2)}
                                    </pre>
                                </div>
                                {task.errorMessage && (
                                    <div>
                                        <h3 className="text-lg font-medium text-red-500">Chyba</h3>
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-md mt-2">
                                            <div className="flex">
                                                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                                <p className="text-red-800">{task.errorMessage}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seznam odkazů</CardTitle>
                            <CardDescription>
                                Odkazy nalezené a zpracované scraperem
                            </CardDescription>
                        </CardHeader>
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
                                                    {(link.status === "PENDING" || link.status === "FAILED") && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => processLinkMutation.mutate({
                                                                taskId: task.id,
                                                                link: link.link
                                                            })}
                                                            disabled={processLinkMutation.isLoading}
                                                        >
                                                            {processLinkMutation.isLoading ? (
                                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <Play className="mr-2 h-3 w-3" />
                                                            )}
                                                            Zpracovat
                                                        </Button>
                                                    )}
                                                    {link.status === "PROCESSED" && (
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
                </TabsContent>

                <TabsContent value="logs" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logy úlohy</CardTitle>
                            <CardDescription>
                                Historie zpracování a události úlohy
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!logs || logs.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-muted-foreground">Žádné logy nebyly nalezeny.</p>
                                </div>
                            ) : (
                                <div className="max-h-[600px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Čas</TableHead>
                                                <TableHead>Úroveň</TableHead>
                                                <TableHead>Zpráva</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        {formatDate(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                log.level === 'ERROR'
                                                                    ? 'danger'
                                                                    : log.level === 'WARNING'
                                                                        ? 'warning'
                                                                        : log.level === 'INFO'
                                                                            ? 'info'
                                                                            : 'default'
                                                            }
                                                        >
                                                            {log.level}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-2xl">
                                                        <p className="whitespace-normal break-words">{log.message}</p>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TaskDetail;
