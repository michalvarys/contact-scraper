import React, { createContext, useCallback, useContext, useState } from 'react';
import { ToastContainer, ToastItem } from './ToastContainer';

export interface ToastContextType {
    toast: (props: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
    children: React.ReactNode;
}

// Jednoduchá funkce pro generování ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((props: Omit<ToastItem, 'id'>) => {
        const id = generateId();
        setToasts((prev) => [...prev, { id, ...props }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
