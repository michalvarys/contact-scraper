import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AddLinkFormValues } from '@/pages/tasks/hooks/useTaskLinks';
import Button from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Loader2 } from 'lucide-react';
import {
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage
} from '@/components/atoms/Form';

interface AddLinkFormProps {
    form: UseFormReturn<AddLinkFormValues>;
    onSubmit: (values: AddLinkFormValues) => void;
    isLoading: boolean;
}

export const AddLinkForm: React.FC<AddLinkFormProps> = ({ form, onSubmit, isLoading }) => {
    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
                <FormLabel>URL adresa</FormLabel>
                <FormControl>
                    <Input
                        placeholder="https://example.com"
                        {...form.register('link')}
                        disabled={isLoading}
                    />
                </FormControl>
                <FormDescription>
                    Zadejte URL adresu, kterou chcete přidat do fronty ke zpracování.
                </FormDescription>
                <FormMessage>{form.formState.errors.link?.message}</FormMessage>
            </FormItem>
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Přidávám...
                        </>
                    ) : (
                        "Přidat odkaz"
                    )}
                </Button>
            </div>
        </form>
    );
};
