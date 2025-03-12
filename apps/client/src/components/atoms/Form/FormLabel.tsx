import { cn } from "@/lib/utils";
import React from "react";

/**
 * FormLabel - popisek pole ve formuláři
 */
const FormLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
);

export default FormLabel;
