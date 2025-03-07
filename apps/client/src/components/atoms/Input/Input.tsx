import * as React from "react"
import { cn } from "@/lib/utils"

const inputBaseClasses =
    "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm " +
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] " +
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Atomická komponenta pro vstupní pole
 * 
 * @example
 * ```tsx
 * <Input placeholder="Zadejte text" />
 * <Input type="number" min={0} max={100} />
 * <Input type="email" required />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                data-slot="input"
                className={cn(inputBaseClasses, className)}
                {...props}
            />
        )
    }
)

Input.displayName = "Input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Atomická komponenta pro víceřádkové vstupní pole
 * 
 * @example
 * ```tsx
 * <Textarea placeholder="Zadejte text" />
 * <Textarea rows={5} />
 * <Textarea required />
 * ```
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                data-slot="textarea"
                className={cn(inputBaseClasses, className)}
                {...props}
            />
        )
    }
)

Textarea.displayName = "Textarea"

export default Input
