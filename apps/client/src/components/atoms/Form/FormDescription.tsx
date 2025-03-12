import { cn } from "@/lib/utils";
import React from "react";

/**
 * FormDescription - popisek pod polem formuláře
 */
const FormDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export default FormDescription;
