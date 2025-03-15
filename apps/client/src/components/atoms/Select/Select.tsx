import React, { Children, forwardRef, isValidElement, ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
    /**
     * Obsah Select komponenty (obvykle SelectItem)
     */
    children: React.ReactNode;
    /**
     * Hodnota komponenty
     */
    value?: string;
    /**
     * Výchozí hodnota
     */
    defaultValue?: string;
    /**
     * Callback při změně hodnoty
     */
    onValueChange?: (value: string) => void;
    /**
     * Zakázat komponentu
     */
    disabled?: boolean;
    /**
     * Placeholder text při nevybrané hodnotě
     */
    placeholder?: string;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
    ({ children, className, defaultValue, value, onValueChange, disabled, ...props }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedValue, setSelectedValue] = useState(value || defaultValue || "");
        const [displayValue, setDisplayValue] = useState<string>("");
        const selectId = useId();

        // Najde popisek pro vybranou hodnotu
        useEffect(() => {
            // Najdi v dětech SelectItem s odpovídající hodnotou
            Children.forEach(children, (child) => {
                //@ts-ignore
                if (isValidElement(child) && 'value' in child.props && child.props.value === selectedValue) {
                    //@ts-ignore
                    if (typeof child.props.children === 'string') {
                        //@ts-ignore
                        setDisplayValue(child.props.children);
                    }
                }
            });
        }, [children, selectedValue]);

        // Aktualizace hodnoty z props
        useEffect(() => {
            if (value !== undefined && value !== selectedValue) {
                setSelectedValue(value);
            }
        }, [value]);

        const handleSelect = (value: string) => {
            setSelectedValue(value);
            setIsOpen(false);
            if (onValueChange) {
                onValueChange(value);
            }
        };

        return (
            <div
                className={cn(
                    "relative w-full",
                    className
                )}
                ref={ref}
            >
                <div
                    className={cn(
                        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        isOpen && "ring-1 ring-ring",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    id={selectId}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-disabled={disabled}
                    role="combobox"
                >
                    <span className={cn(!selectedValue && "text-muted-foreground")}>
                        {displayValue || props.placeholder || "Vyberte možnost"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
                {isOpen && !disabled && (
                    <div
                        className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                        role="listbox"
                        aria-labelledby={selectId}
                    >
                        <div className="p-1">
                            {React.Children.map(children, (child) => {
                                if (React.isValidElement(child)) {
                                    // Předáme handleSelect do každého SelectItem
                                    return React.cloneElement(child, {
                                        //@ts-ignore
                                        onSelect: handleSelect,
                                        //@ts-ignore
                                        isSelected: child.props.value === selectedValue,
                                    });
                                }
                                return child;
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";

//@ts-ignore
export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Hodnota položky
     */
    value: string;
    /**
     * Callback pro výběr položky (interně použitý)
     */
    onSelect?: (value: string) => void;
    /**
     * Je položka vybrána? (interně použitý)
     */
    isSelected?: boolean;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
    ({ className, children, value, onSelect, isSelected, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground",
                    className
                )}
                onClick={() => onSelect && onSelect(value)}
                role="option"
                aria-selected={isSelected}
                {...props}
            >
                {children}
                {isSelected && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </span>
                )}
            </div>
        );
    }
);

SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
