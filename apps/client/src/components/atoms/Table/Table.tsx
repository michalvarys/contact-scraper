import * as React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.ComponentProps<"table"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro tabulku
 * 
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Název</TableHead>
 *       <TableHead>Hodnota</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Položka 1</TableCell>
 *       <TableCell>100</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                data-slot="table-container"
                className="relative w-full max-h-[75vh] overflow-y-auto overflow-x-auto"
            >
                <table
                    ref={ref}
                    data-slot="table"
                    className={cn("w-full caption-bottom text-sm", className)}
                    {...props}
                />
            </div>
        );
    }
);

Table.displayName = "Table";

export interface TableHeaderProps extends React.ComponentProps<"thead"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah hlavičky tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro hlavičku tabulky
 */
export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
    ({ className, ...props }, ref) => {
        return (
            <thead
                ref={ref}
                data-slot="table-header"
                className={cn("[&_tr]:border-b", className)}
                {...props}
            />
        );
    }
);

TableHeader.displayName = "TableHeader";

export interface TableBodyProps extends React.ComponentProps<"tbody"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah těla tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro tělo tabulky
 */
export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
    ({ className, ...props }, ref) => {
        return (
            <tbody
                ref={ref}
                data-slot="table-body"
                className={cn("[&_tr:last-child]:border-0", className)}
                {...props}
            />
        );
    }
);

TableBody.displayName = "TableBody";

export interface TableFooterProps extends React.ComponentProps<"tfoot"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah patičky tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro patičku tabulky
 */
export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
    ({ className, ...props }, ref) => {
        return (
            <tfoot
                ref={ref}
                data-slot="table-footer"
                className={cn(
                    "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
                    className
                )}
                {...props}
            />
        );
    }
);

TableFooter.displayName = "TableFooter";

export interface TableRowProps extends React.ComponentProps<"tr"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah řádku tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro řádek tabulky
 */
export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ className, ...props }, ref) => {
        return (
            <tr
                ref={ref}
                data-slot="table-row"
                className={cn(
                    "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
                    className
                )}
                {...props}
            />
        );
    }
);

TableRow.displayName = "TableRow";

export interface TableHeadProps extends React.ComponentProps<"th"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah buňky hlavičky
     */
    children?: React.ReactNode;
}

/**
 * Atomická komponenta pro buňku hlavičky tabulky
 */
export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, ...props }, ref) => {
        return (
            <th
                ref={ref}
                data-slot="table-head"
                className={cn(
                    "text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                    className
                )}
                {...props}
            />
        );
    }
);

TableHead.displayName = "TableHead";

export interface TableCellProps extends React.ComponentProps<"td"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah buňky
     */
    children?: React.ReactNode;
}

/**
 * Atomická komponenta pro buňku tabulky
 */
export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, ...props }, ref) => {
        return (
            <td
                ref={ref}
                data-slot="table-cell"
                className={cn(
                    "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                    className
                )}
                {...props}
            />
        );
    }
);

TableCell.displayName = "TableCell";

export interface TableCaptionProps extends React.ComponentProps<"caption"> {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Obsah popisku tabulky
     */
    children: React.ReactNode;
}

/**
 * Atomická komponenta pro popisek tabulky
 */
export const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
    ({ className, ...props }, ref) => {
        return (
            <caption
                ref={ref}
                data-slot="table-caption"
                className={cn("text-muted-foreground mt-4 text-sm", className)}
                {...props}
            />
        );
    }
);

TableCaption.displayName = "TableCaption";

export default Table;
