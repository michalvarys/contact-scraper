import React, { useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const toastVariants = cva(
    'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all',
    {
        variants: {
            variant: {
                default: 'bg-background border',
                success: 'bg-green-50 border-green-200 text-green-800',
                destructive: 'bg-red-50 border-red-200 text-red-800',
                warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                info: 'bg-blue-50 border-blue-200 text-blue-800',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
    title?: string;
    description?: string;
    onClose?: () => void;
    duration?: number;
    className?: string;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
    ({ title, description, onClose, duration = 5000, variant, className, ...props }, ref) => {
        useEffect(() => {
            if (duration !== Infinity) {
                const timer = setTimeout(() => {
                    onClose?.();
                }, duration);

                return () => {
                    clearTimeout(timer);
                };
            }
        }, [duration, onClose]);

        return (
            <div
                ref={ref}
                className={cn(toastVariants({ variant }), className)}
                {...props}
            >
                <div className="flex-1">
                    {title && <div className="font-medium">{title}</div>}
                    {description && <div className="text-sm opacity-90">{description}</div>}
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }
);

Toast.displayName = 'Toast';
