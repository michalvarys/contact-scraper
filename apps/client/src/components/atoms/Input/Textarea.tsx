import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /**
     * Plný width komponentu
     */
    fullWidth?: boolean;
}

/**
 * Základní textarea komponenta pro víceřádkové vstupy
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, fullWidth, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    fullWidth && "w-full",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Textarea.displayName = "Textarea";

export default Textarea;
