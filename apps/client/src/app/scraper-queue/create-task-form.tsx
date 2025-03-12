"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { Controller, ControllerProps, FieldValues, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import Checkbox from "@/components/atoms/Checkbox";
import { Select, SelectItem } from "@/components/atoms/Select";
import { Loader2 } from "lucide-react";
import { trpc } from "@/trpc/trpc";
import { cn } from "@/lib/utils";


// FormItem - obaluje položku formuláře
const FormItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("space-y-2", className)} {...props} />
);

// FormLabel - popisek pole
const FormLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
);

// FormControl - kontrolní prvek
const FormControl = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1">{children}</div>
);

// FormDescription - popisek pod polem
const FormDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

// FormMessage - chybová zpráva
const FormMessage = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm font-medium text-destructive", className)} {...props} />
);

// Pomocné komponenty pro Select
// Budou nahrazeny atomickými komponentami po úplném přechodu
// na atomickou strukturu
const SelectValue = ({ placeholder }: { placeholder: string }) => (
    <span className="text-muted-foreground">{placeholder}</span>
);

const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
    <div className="border border-input px-3 py-2 rounded-md flex items-center justify-between">
        {children}
        <span>▼</span>
    </div>
);

const SelectContent = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1 border border-input bg-white rounded-md shadow-sm max-h-60 overflow-auto p-1">
        {children}
    </div>
);

// Schéma pro validaci formuláře
const formSchema = z.object({
    scraperType: z.string({
        required_error: "Je nutné vybrat typ scraperu.",
    }),
    industry: z.string().optional(),
    region: z.string().optional(),
    searchQuery: z.string().optional(),
    headless: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskFormProps {
    onSuccess: () => void;
}

const CreateTaskForm = ({ onSuccess }: CreateTaskFormProps) => {
    // Získání dostupných typů scraperů
    const { data: scraperTypes, isLoading: isLoadingTypes } = trpc.scraper.getScraperTypes.useQuery();

    // Mutace pro vytvoření nové úlohy
    const createTaskMutation = trpc.scraper.createTask.useMutation({
        onSuccess: () => {
            onSuccess();
            form.reset();
        },
    });

    // Inicializace formuláře
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            industry: "",
            region: "",
            searchQuery: "",
            headless: true,
        },
    });

    // Odeslání formuláře
    const onSubmit = (values: FormValues) => {
        createTaskMutation.mutate({
            scraperType: values.scraperType,
            scraperConfig: {
                industry: values.industry || undefined,
                region: values.region || undefined,
                headless: values.headless,
            },
            industry: values.industry || undefined,
            region: values.region || undefined,
            searchQuery: values.searchQuery || undefined,
        });
    };
    const { register } = form
    return (
        <FormProvider {...form}>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <FormItem>
                    <FormLabel>Typ scraperu</FormLabel>
                    <Select
                        disabled={isLoadingTypes || createTaskMutation.isLoading}
                        {...register('scraperType')}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Vyberte typ scraperu" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {scraperTypes?.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        Vyberte typ scraperu, který chcete použít.
                    </FormDescription>
                    <FormMessage />
                </FormItem>

                <div className="grid grid-cols-2 gap-4">
                    <FormItem>
                        <FormLabel>Průmysl/obor</FormLabel>
                        <FormControl>
                            <Input
                                disabled={createTaskMutation.isLoading}
                                placeholder="Např. restaurace, hotely, ..."
                                {...register('industry')}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                            <Input
                                disabled={createTaskMutation.isLoading}
                                placeholder="Např. Praha, Brno, ..."
                                {...register('region')}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </div>

                <FormItem>
                    <FormLabel>Vyhledávací dotaz</FormLabel>
                    <FormControl>
                        <Input
                            disabled={createTaskMutation.isLoading}
                            placeholder="Volitelný vyhledávací dotaz"
                            {...register('searchQuery')}
                        />
                    </FormControl>
                    <FormDescription>
                        Pokud necháte prázdné, bude použit průmysl a region.
                    </FormDescription>
                    <FormMessage />
                </FormItem>

                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                            disabled={createTaskMutation.isLoading}
                            {...register('headless')}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Headless mód</FormLabel>
                        <FormDescription>
                            Povolit headless mód (bez zobrazení prohlížeče) pro rychlejší scrapování.
                        </FormDescription>
                    </div>
                </FormItem>
                <Button
                    type="submit"
                    disabled={createTaskMutation.isLoading}
                    className="w-full"
                >
                    {createTaskMutation.isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Vytvářím úlohu...
                        </>
                    ) : (
                        "Vytvořit úlohu"
                    )}
                </Button>
            </form>
        </FormProvider>
    );
};

export default CreateTaskForm;
