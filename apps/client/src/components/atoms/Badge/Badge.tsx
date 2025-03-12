import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Varianta badge
     */
    variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

/**
 * Atomická komponenta pro zobrazení Badge
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = "default", ...props }, ref) => {
        const variantClassMap = {
            default: "bg-primary",
            success: "bg-green-500",
            warning: "bg-yellow-500",
            danger: "bg-red-500",
            info: "bg-blue-500",
            outline: "bg-transparent border border-primary text-primary",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white",
                    variantClassMap[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = "Badge";

export default Badge;
