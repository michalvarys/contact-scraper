import React, { useState } from "react";
import Button from "@/components/atoms/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Loader2, Save } from "lucide-react";
import { JsonEditor } from "json-edit-react";

interface JsonConfigEditorProps {
    /**
     * Aktuální konfigurace
     */
    config: Record<string, any>;
    /**
     * Callback při uložení změn
     */
    onSave: (newConfig: Record<string, any>) => void;
    /**
     * Indikace ukládání
     */
    isSaving?: boolean;
    /**
     * Titulek editoru
     */
    title?: string;
    /**
     * Popis editoru
     */
    description?: string;
}

/**
 * Editor pro JSON konfiguraci
 */
const JsonConfigEditor: React.FC<JsonConfigEditorProps> = ({
    config,
    onSave,
    isSaving,
    title = "Konfigurace",
    description = "Upravte konfiguraci scraperu"
}) => {
    const [editedConfig, setEditedConfig] = useState<string>(
        JSON.stringify(config, null, 2)
    );
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        try {
            const parsedConfig = JSON.parse(editedConfig);
            onSave(parsedConfig);
            setError(null);
        } catch (err) {
            setError("Neplatný JSON formát");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <JsonEditor
                        className="w-full h-[300px] p-4 font-mono text-sm bg-background border-0 focus:outline-none resize-none"
                        data={JSON.parse(editedConfig)}
                        setData={(data) => setEditedConfig(JSON.stringify(data))}
                    />
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !!error}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Ukládám...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Uložit změny
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default JsonConfigEditor;
