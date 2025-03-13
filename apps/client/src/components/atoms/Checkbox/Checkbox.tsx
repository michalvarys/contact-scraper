import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * Identifikátor komponenty
     */
    id?: string;
    /**
     * Aktuální hodnota zaškrtnutí
     */
    checked?: boolean;
    /**
     * Callback volaný při změně hodnoty
     */
    onCheckedChange?: (checked: boolean) => void;
}

/**
 * Komponenta Checkbox pro zaškrtávací políčka
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => {

        console.log({ className, checked, onCheckedChange, ...props });
        return (
            <label className="relative flex items-center">
                <input
                    {...props}
                    type="checkbox"
                    className="peer sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                />
                <div
                    className={cn(
                        "h-4 w-4 shrink-0 rounded-sm border border-primary shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                        className,
                        checked && "bg-primary"
                    )}
                >
                    {checked && (
                        <Check
                            className="h-3 w-3 pl-0.5 pt-0.5 text-white stroke-[4]"
                            aria-hidden="true"
                        />
                    )}
                </div>
            </label>
        );
    }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
