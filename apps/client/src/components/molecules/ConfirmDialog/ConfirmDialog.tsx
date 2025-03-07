import React from 'react';
import { Button } from '@/components/atoms/Button';

export interface ConfirmDialogProps {
    /**
     * Zda je dialog otevřený
     */
    isOpen: boolean;
    /**
     * Nadpis dialogu
     */
    title: string;
    /**
     * Zpráva v dialogu
     */
    message: string;
    /**
     * Text potvrzovacího tlačítka
     */
    confirmLabel: string;
    /**
     * Text tlačítka pro zrušení
     */
    cancelLabel: string;
    /**
     * Callback při potvrzení
     */
    onConfirm: () => void;
    /**
     * Callback při zrušení
     */
    onCancel: () => void;
    /**
     * Varianta potvrzovacího tlačítka
     */
    confirmVariant?: 'default' | 'destructive' | 'outline';
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro potvrzovací dialog
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   title="Smazat položku"
 *   message="Opravdu chcete smazat tuto položku?"
 *   confirmLabel="Smazat"
 *   cancelLabel="Zrušit"
 *   onConfirm={handleDelete}
 *   onCancel={() => setIsOpen(false)}
 *   confirmVariant="destructive"
 * />
 * ```
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    confirmVariant = 'destructive',
    className,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white p-6 rounded-lg shadow-lg max-w-md w-full ${className}`}>
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="mb-6">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button aria-label="cancel" variant="outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
