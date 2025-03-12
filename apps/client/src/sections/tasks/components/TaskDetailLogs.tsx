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
import Badge from '@/components/atoms/Badge';
import { formatDate } from '../utils/date';

interface TaskDetailLogsProps {
    logs: any[] | undefined;
}

export const TaskDetailLogs: React.FC<TaskDetailLogsProps> = ({ logs }) => {
    return (
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
    );
};
