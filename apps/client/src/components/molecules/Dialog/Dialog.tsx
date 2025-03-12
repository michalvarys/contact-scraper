import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------- Dialog Context ------------- */

type DialogContextType = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenChange?: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextType | null>(null);

const useDialogContext = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error("Dialog components must be used within a Dialog component");
    }
    return context;
};

/* ------------- Dialog Components ------------- */

export interface DialogProps {
    /**
     * Obsah dialogu
     */
    children: React.ReactNode;
    /**
     * Stav otevření dialogu
     */
    open?: boolean;
    /**
     * Callback při změně stavu dialogu
     */
    onOpenChange?: (open: boolean) => void;
}

/**
 * Kontejner pro dialog, který spravuje stav a kontext
 */
const Dialog = ({ children, open = false, onOpenChange }: DialogProps) => {
    const [internalOpen, setInternalOpen] = useState(open);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;

    const setOpen = (value: boolean) => {
        if (!isControlled) {
            setInternalOpen(value);
        }
        onOpenChange?.(value);
    };

    return (
        <DialogContext.Provider value={{ open: isOpen, setOpen, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    );
};

export interface DialogTriggerProps {
    /**
     * Obsah triggeru
     */
    children: React.ReactNode;
    /**
     * Použít přímo dětský element jako trigger
     */
    asChild?: boolean;
}

/**
 * Element, který spustí otevření dialogu
 */
const DialogTrigger = ({ children, asChild = false }: DialogTriggerProps) => {
    const { setOpen } = useDialogContext();

    const handleClick = () => {
        setOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            onClick: (e: React.MouseEvent) => {
                handleClick();
                (children.props as any).onClick?.(e);
            },
        });
    }

    return (
        <div onClick={handleClick}>
            {children}
        </div>
    );
};

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Obsah dialogu
     */
    children: React.ReactNode;
}

/**
 * Obsah dialogu
 */
const DialogContent = ({ children, className, ...props }: DialogContentProps) => {
    const { open, setOpen } = useDialogContext();

    if (!open) return null;

    return (
        <div
            className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50", className)}
            onClick={(e) => {
                // Zavře dialog při kliknutí na backdrop
                if (e.currentTarget === e.target) {
                    setOpen(false);
                }
            }}
            {...props}
        >
            <div
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * Hlavička dialogu
 */
const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
    <div
        className={cn("flex flex-col space-y-2 text-left mb-4", className)}
        {...props}
    />
);

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

/**
 * Nadpis dialogu
 */
const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
    <h2
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
    />
);

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

/**
 * Popis dialogu
 */
const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => (
    <p
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
);

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * Patička dialogu
 */
const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
    <div
        className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
        {...props}
    />
);

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
};
