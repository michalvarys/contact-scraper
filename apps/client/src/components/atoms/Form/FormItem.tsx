import { cn } from "@/lib/utils";
import React from "react";

/**
 * FormItem - wrapper pro položku formuláře
 */
const FormItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("space-y-2", className)} {...props} />
);

export default FormItem;
