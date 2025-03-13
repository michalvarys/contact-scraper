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
import Badge from '@/components/atoms/Badge';
import { formatDate } from '../utils/date';
import { Filter } from 'lucide-react';
import CustomSelect from '@/components/molecules/CustomSelect';

// Enum pro úrovně logů
enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

interface TaskDetailLogsProps {
    logs: any[] | undefined;
}

export const TaskDetailLogs: React.FC<TaskDetailLogsProps> = ({ logs }) => {
    // Stav pro filtrování podle úrovní logů - pole vybraných úrovní
    const [levelFilters, setLevelFilters] = useState<string[]>([]);

    // Možnosti pro filtrování podle úrovně logů
    const levelOptions = useMemo(() => [
        { id: LogLevel.DEBUG, value: LogLevel.DEBUG, label: 'DEBUG' },
        { id: LogLevel.INFO, value: LogLevel.INFO, label: 'INFO' },
        { id: LogLevel.WARNING, value: LogLevel.WARNING, label: 'WARNING' },
        { id: LogLevel.ERROR, value: LogLevel.ERROR, label: 'ERROR' },
    ], []);

    // Filtrování logů podle vybraných úrovní
    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        if (levelFilters.length === 0) {
            return logs;
        }
        return logs.filter(log => levelFilters.includes(log.level));
    }, [logs, levelFilters]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Logy úlohy</CardTitle>
                    <CardDescription>
                        Historie zpracování a události úlohy
                    </CardDescription>
                </div>
                <div className="flex items-center">
                    <CustomSelect
                        placeholder="Filtrovat podle úrovně"
                        className="min-w-[200px]"
                        multiple
                        value={levelFilters}
                        options={levelOptions}
                        onChange={(values) => setLevelFilters(values as string[])}
                    />
                    <Filter className="ml-2 h-4 w-4 text-gray-500" />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!logs || logs.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Žádné logy nebyly nalezeny.</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Žádné logy neodpovídají vybranému filtru.</p>
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
                                {filteredLogs.map((log) => (
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
    );
};
