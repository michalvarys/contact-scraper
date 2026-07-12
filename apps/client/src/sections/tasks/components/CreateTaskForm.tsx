"use client";

import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import Checkbox from "@/components/atoms/Checkbox";
import { Select, SelectItem } from "@/components/atoms/Select";
import { Loader2 } from "lucide-react";
import { trpc } from "@/trpc/trpc";
import {
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage
} from "@/components/atoms/Form";
import { useToast } from "@/hooks";

// Schéma pro validaci formuláře
const formSchema = z.object({
    scraperType: z.string({
        required_error: "Je nutné vybrat typ scraperu.",
    }),
    searchQuery: z.string().optional(),
    headless: z.boolean().default(true),
    maxPages: z.coerce
        .number()
        .int()
        .min(0, "Hodnota nesmí být záporná.")
        .optional(),
    icpProfileId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskFormProps {
    onSuccess: () => void;
}

const CreateTaskForm = ({ onSuccess }: CreateTaskFormProps) => {
    // Získání dostupných typů scraperů
    const { data: scraperTypes, isLoading: isLoadingTypes } = trpc.scraper.getScraperTypes.useQuery();
    const { toast } = useToast();

    // Mutace pro vytvoření nové úlohy
    const createTaskMutation = trpc.scraper.createTask.useMutation({
        onSuccess: (data) => {
            toast({
                title: "Úloha byla úspěšně vytvořena",
                description: `Úloha ID: ${data.id} byla vytvořena a zařazena do fronty.`,
                variant: "success",
                duration: 5000,
            });
            onSuccess();
            form.reset();
        },
        onError: (error) => {
            toast({
                title: "Chyba při vytváření úlohy",
                description: error.message || "Nastala neočekávaná chyba při vytváření úlohy.",
                variant: "destructive",
                duration: 5000,
            });
        },
    });

    // Inicializace formuláře
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            searchQuery: "",
            headless: true,
            maxPages: undefined,
        },
    });

    // ICP profily
    const { data: icpProfiles } = trpc.icp.list.useQuery();

    // Odeslání formuláře
    const onSubmit = (values: FormValues) => {
        createTaskMutation.mutate({
            scraperType: values.scraperType,
            scraperConfig: {
                headless: values.headless,
                ...(values.maxPages && values.maxPages > 0
                    ? { maxPages: values.maxPages }
                    : {}),
            },
            searchQuery: values.searchQuery || undefined,
            icpProfileId: values.icpProfileId || undefined,
        });
    };

    const { register } = form;

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <Controller control={form.control} name="scraperType" render={({ field }) => (
                <FormItem>
                    <FormLabel>Typ scraperu</FormLabel>
                    <Select
                        disabled={isLoadingTypes || createTaskMutation.isLoading}
                        onValueChange={field.onChange}
                        value={field.value}
                    >
                        <SelectItem value="">
                            Vyberte typ scraperu
                        </SelectItem>
                        {scraperTypes?.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type}
                            </SelectItem>
                        ))}
                    </Select>
                    <FormDescription>
                        Vyberte typ scraperu, který chcete použít.
                    </FormDescription>
                    <FormMessage>{form.formState.errors.scraperType?.message}</FormMessage>
                </FormItem>)}
            />

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
                <FormMessage>{form.formState.errors.searchQuery?.message}</FormMessage>
            </FormItem>

            <FormItem>
                <FormLabel>Maximální počet stránek</FormLabel>
                <FormControl>
                    <Input
                        type="number"
                        min={0}
                        disabled={createTaskMutation.isLoading}
                        placeholder="Bez limitu"
                        {...register('maxPages')}
                    />
                </FormControl>
                <FormDescription>
                    Omezí, kolik stránek výsledků scraper projde. Necháte-li prázdné (nebo 0),
                    projdou se všechny dostupné stránky.
                </FormDescription>
                <FormMessage>{form.formState.errors.maxPages?.message}</FormMessage>
            </FormItem>

            <Controller control={form.control} name="icpProfileId" render={({ field }) => (
                <FormItem>
                    <FormLabel>ICP Profil (volitelný)</FormLabel>
                    <Select
                        disabled={createTaskMutation.isLoading}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                    >
                        <SelectItem value="">
                            Bez ICP
                        </SelectItem>
                        {icpProfiles?.map((icp) => (
                            <SelectItem key={icp.id} value={icp.id}>
                                {icp.name}
                            </SelectItem>
                        ))}
                    </Select>
                    <FormDescription>
                        Po dokončení scrapování se automaticky spustí AI scoring firem proti tomuto ICP.
                    </FormDescription>
                </FormItem>)}
            />

            <Controller control={form.control} name="headless" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                            {...field}
                            ref={field.ref}
                            name={field.name}
                            value={field.value.toString()}
                            disabled={createTaskMutation.isLoading}
                            checked={field.value}
                            onCheckedChange={(value) => field.onChange(value)}
                        // {...register('headless')}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Headless mód</FormLabel>
                        <FormDescription>
                            Povolit headless mód (bez zobrazení prohlížeče) pro rychlejší scrapování.
                        </FormDescription>
                    </div>
                </FormItem>
            )} />
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
    );
};

export default CreateTaskForm;
