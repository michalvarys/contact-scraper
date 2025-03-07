import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.ComponentProps<typeof SelectPrimitive.Root> {
    /**
     * Obsah selectu
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro select
 * 
 * @example
 * ```tsx
 * <Select onValueChange={(value) => console.log(value)}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Vyberte..." />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Položka 1</SelectItem>
 *     <SelectItem value="2">Položka 2</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 */
export const Select: React.FC<SelectProps> = (props) => {
    return <SelectPrimitive.Root data-slot="select" {...props} />;
};

Select.displayName = "Select";

export interface SelectGroupProps extends React.ComponentProps<typeof SelectPrimitive.Group> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah skupiny
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro skupinu položek v selectu
 */
export const SelectGroup = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Group>,
    SelectGroupProps
>(({ ...props }, ref) => {
    return <SelectPrimitive.Group ref={ref} data-slot="select-group" {...props} />;
});

SelectGroup.displayName = "SelectGroup";

export interface SelectValueProps extends React.ComponentProps<typeof SelectPrimitive.Value> {
    /**
     * Placeholder pro prázdnou hodnotu
     */
    placeholder?: string;
}

/**
 * Atomická komponenta pro hodnotu selectu
 */
export const SelectValue = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Value>,
    SelectValueProps
>(({ ...props }, ref) => {
    return <SelectPrimitive.Value ref={ref} data-slot="select-value" {...props} />;
});

SelectValue.displayName = "SelectValue";

export interface SelectTriggerProps extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah triggeru
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro trigger selectu
 */
export const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    SelectTriggerProps
>(({ className, children, ...props }, ref) => {
    return (
        <SelectPrimitive.Trigger
            ref={ref}
            data-slot="select-trigger"
            className={cn(
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDownIcon className="size-4 opacity-50" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
});

SelectTrigger.displayName = "SelectTrigger";

export interface SelectContentProps extends React.ComponentProps<typeof SelectPrimitive.Content> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah selectu
     */
    children: React.ReactNode;
    /**
     * Pozice selectu
     */
    position?: "popper" | "item-aligned";
}

/**
 * Atomická komponenta pro obsah selectu
 */
export const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    SelectContentProps
>(({ className, children, position = "popper", ...props }, ref) => {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                ref={ref}
                data-slot="select-content"
                className={cn(
                    "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md",
                    position === "popper" &&
                    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                    className
                )}
                position={position}
                {...props}
            >
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                    className={cn(
                        "p-1",
                        position === "popper" &&
                        "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
});

SelectContent.displayName = "SelectContent";

export interface SelectLabelProps extends React.ComponentProps<typeof SelectPrimitive.Label> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah labelu
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro label selectu
 */
export const SelectLabel = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Label>,
    SelectLabelProps
>(({ className, ...props }, ref) => {
    return (
        <SelectPrimitive.Label
            ref={ref}
            data-slot="select-label"
            className={cn("px-2 py-1.5 text-sm font-medium", className)}
            {...props}
        />
    );
});

SelectLabel.displayName = "SelectLabel";

export interface SelectItemProps extends React.ComponentProps<typeof SelectPrimitive.Item> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah položky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro položku selectu
 */
export const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    SelectItemProps
>(({ className, children, ...props }, ref) => {
    return (
        <SelectPrimitive.Item
            ref={ref}
            data-slot="select-item"
            className={cn(
                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className
            )}
            {...props}
            value={props.value || '-'}
        >
            <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
});

SelectItem.displayName = "SelectItem";

export interface SelectSeparatorProps extends React.ComponentProps<typeof SelectPrimitive.Separator> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Atomická komponenta pro oddělovač v selectu
 */
export const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Separator>,
    SelectSeparatorProps
>(({ className, ...props }, ref) => {
    return (
        <SelectPrimitive.Separator
            ref={ref}
            data-slot="select-separator"
            className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
            {...props}
        />
    );
});

SelectSeparator.displayName = "SelectSeparator";

export interface SelectScrollUpButtonProps extends React.ComponentProps<typeof SelectPrimitive.ScrollUpButton> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Atomická komponenta pro tlačítko pro scrollování nahoru v selectu
 */
export const SelectScrollUpButton = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
    SelectScrollUpButtonProps
>(({ className, ...props }, ref) => {
    return (
        <SelectPrimitive.ScrollUpButton
            ref={ref}
            data-slot="select-scroll-up-button"
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronUpIcon className="size-4" />
        </SelectPrimitive.ScrollUpButton>
    );
});

SelectScrollUpButton.displayName = "SelectScrollUpButton";

export interface SelectScrollDownButtonProps extends React.ComponentProps<typeof SelectPrimitive.ScrollDownButton> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Atomická komponenta pro tlačítko pro scrollování dolů v selectu
 */
export const SelectScrollDownButton = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
    SelectScrollDownButtonProps
>(({ className, ...props }, ref) => {
    return (
        <SelectPrimitive.ScrollDownButton
            ref={ref}
            data-slot="select-scroll-down-button"
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronDownIcon className="size-4" />
        </SelectPrimitive.ScrollDownButton>
    );
});

SelectScrollDownButton.displayName = "SelectScrollDownButton";

export default Select;
