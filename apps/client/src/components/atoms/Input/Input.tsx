import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * Plný width komponentu
     */
    fullWidth?: boolean;
}

/**
 * Základní input komponenta pro textové vstupy
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, fullWidth, ...props }, ref) => {
        return (
            <input
                type={type || "text"}
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    fullWidth && "w-full",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export default Input;
