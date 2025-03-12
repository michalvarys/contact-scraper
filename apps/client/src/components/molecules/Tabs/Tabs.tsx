import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------- Tabs Context ------------- */

type TabsContextType = {
    value: string;
    onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | null>(null);

const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error("Tabs components must be used within a Tabs component");
    }
    return context;
};

/* ------------- Tabs Components ------------- */

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Výchozí hodnota aktivního tabu
     */
    defaultValue?: string;
    /**
     * Aktuální hodnota aktivního tabu (kontrolovaný komponent)
     */
    value?: string;
    /**
     * Callback při změně hodnoty
     */
    onValueChange?: (value: string) => void;
}

/**
 * Kontejnerová komponenta pro Tabs
 */
const Tabs = ({
    defaultValue,
    value,
    onValueChange,
    children,
    className,
    ...props
}: TabsProps) => {
    const [internalValue, setInternalValue] = useState(defaultValue || "");

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleValueChange = (newValue: string) => {
        if (!isControlled) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
            <div className={cn("", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * Kontejner pro seznam tabů
 */
const TabsList = ({ className, ...props }: TabsListProps) => {
    return (
        <div
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
                className
            )}
            role="tablist"
            {...props}
        />
    );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Hodnota tabu, která bude nastavena po kliknutí na trigger
     */
    value: string;
}

/**
 * Tlačítko pro přepnutí na tab
 */
const TabsTrigger = ({ className, value, children, ...props }: TabsTriggerProps) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isActive = selectedValue === value;

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-background text-foreground shadow-sm",
                className
            )}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onValueChange(value)}
            {...props}
        >
            {children}
        </button>
    );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Hodnota tabu, pro který se má zobrazit obsah
     */
    value: string;
}

/**
 * Obsah tabu
 */
const TabsContent = ({ className, value, children, ...props }: TabsContentProps) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
        <div
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            role="tabpanel"
            tabIndex={0}
            {...props}
        >
            {children}
        </div>
    );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
