import { cn } from "@/lib/utils";
import React from "react";

/**
 * FormMessage - chybová zpráva ve formuláři
 */
const FormMessage = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm font-medium text-destructive", className)} {...props} />
);

export default FormMessage;
