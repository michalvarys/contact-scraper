import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/atoms/Card';
import { AlertCircle } from 'lucide-react';
import { ScraperTask } from '@/types/scraper';
import JsonConfigEditor from '@/components/molecules/JsonConfigEditor/JsonConfigEditor';

interface TaskDetailInfoProps {
    task: ScraperTask;
    onUpdateConfig: (config: Record<string, any>) => void;
    isUpdatingConfig: boolean;
}

export const TaskDetailInfo: React.FC<TaskDetailInfoProps> = ({
    task,
    onUpdateConfig,
    isUpdatingConfig,
}) => {
    return (
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
                        <div className="mt-2">
                            <JsonConfigEditor
                                config={typeof task.scraperConfig === 'string'
                                    ? JSON.parse(task.scraperConfig)
                                    : task.scraperConfig
                                }
                                onSave={onUpdateConfig}
                                isSaving={isUpdatingConfig}
                            />
                        </div>
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
    );
};
