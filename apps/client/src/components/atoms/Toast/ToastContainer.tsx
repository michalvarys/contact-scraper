import React from 'react';
import { Toast } from './Toast';
import { createPortal } from 'react-dom';

export interface ToastItem {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'success' | 'destructive' | 'warning' | 'info';
    duration?: number;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    if (!isMounted) return null;

    // Použití portálu pro vykreslení toastů mimo běžný DOM strom
    return createPortal(
        <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 md:max-w-[420px]">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    title={toast.title}
                    description={toast.description}
                    variant={toast.variant}
                    duration={toast.duration}
                    onClose={() => onRemove(toast.id)}
                    className="animate-in slide-in-from-right"
                />
            ))}
        </div>,
        document.body
    );
};
