import React, { useState, ReactNode } from 'react';
import Button, { ButtonProps } from '@/components/atoms/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/molecules/Dialog';

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
    /**
     * Text nebo komponenta, která se zobrazí v tlačítku
     */
    children: ReactNode;

    /**
     * Callback, který se zavolá po potvrzení akce
     */
    onConfirm: () => void;

    /**
     * Callback, který se zavolá po zrušení akce
     */
    onCancel?: () => void;

    /**
     * Titulek potvrzovacího dialogu
     */
    confirmTitle?: string;

    /**
     * Popis potvrzovacího dialogu
     */
    confirmDescription?: string;

    /**
     * Text tlačítka pro potvrzení
     */
    confirmButtonText?: string;

    /**
     * Text tlačítka pro zrušení
     */
    cancelButtonText?: string;

    /**
     * Varianta tlačítka pro potvrzení
     */
    confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

    /**
     * Varianta tlačítka pro zrušení
     */
    cancelButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

    /**
     * Zda je tlačítko zakázáno
     */
    disabled?: boolean;
}

/**
 * Atomická komponenta pro tlačítko s potvrzovacím dialogem
 * 
 * @example
 * ```tsx
 * <ConfirmButton
 *   onConfirm={() => console.log('Potvrzeno')}
 *   confirmTitle="Opravdu chcete smazat?"
 *   confirmDescription="Tato akce je nevratná."
 *   variant="danger"
 * >
 *   Smazat
 * </ConfirmButton>
 * ```
 */
export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
    children,
    onConfirm,
    onCancel,
    confirmTitle = 'Potvrdit akci',
    confirmDescription = 'Opravdu chcete provést tuto akci?',
    confirmButtonText = 'Potvrdit',
    cancelButtonText = 'Zrušit',
    confirmButtonVariant = 'default',
    cancelButtonVariant = 'outline',
    disabled = false,
    ...buttonProps
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        onCancel?.();
    };

    const handleConfirm = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <>
            <Button
                {...buttonProps}
                onClick={handleOpen}
                disabled={disabled}
            >
                {children}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{confirmTitle}</DialogTitle>
                        <DialogDescription>
                            {confirmDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button
                            variant={cancelButtonVariant}
                            onClick={handleClose}
                        >
                            {cancelButtonText}
                        </Button>
                        <Button
                            variant={confirmButtonVariant}
                            onClick={handleConfirm}
                        >
                            {confirmButtonText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ConfirmButton;
