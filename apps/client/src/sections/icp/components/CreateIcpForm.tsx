"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/atoms/Form";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  description: z.string().min(10, "Popis musí mít alespoň 10 znaků"),
  scoreThreshold: z.coerce.number().int().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateIcpFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateIcpForm({ onSuccess, onCancel }: CreateIcpFormProps) {
  const createMutation = trpc.icp.create.useMutation({ onSuccess });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      scoreThreshold: 60,
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      name: values.name,
      description: values.description,
      scoreThreshold: values.scoreThreshold,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormItem>
        <FormLabel>Název ICP</FormLabel>
        <FormControl>
          <Input
            placeholder="např. SaaS firmy v Praze"
            {...form.register("name")}
          />
        </FormControl>
        <FormMessage>{form.formState.errors.name?.message}</FormMessage>
      </FormItem>

      <FormItem>
        <FormLabel>Popis ideálního zákazníka</FormLabel>
        <FormControl>
          <textarea
            className="w-full min-h-[100px] p-2 border rounded-md text-sm"
            placeholder="Popište svého ideálního zákazníka - kdo to je, v jakém oboru působí, jakou má velikost, co hledáte... AI rozšíří váš popis do detailních kritérií."
            {...form.register("description")}
          />
        </FormControl>
        <FormDescription>
          AI rozšíří váš popis do detailních kritérií, klíčových slov a
          vyhledávacích dotazů.
        </FormDescription>
        <FormMessage>{form.formState.errors.description?.message}</FormMessage>
      </FormItem>

      <FormItem>
        <FormLabel>Práh skóre (%)</FormLabel>
        <FormControl>
          <Input
            type="number"
            min={0}
            max={100}
            {...form.register("scoreThreshold")}
          />
        </FormControl>
        <FormDescription>
          Firmy s nižším skóre nebudou označeny jako odpovídající ICP (výchozí
          60%).
        </FormDescription>
        <FormMessage>
          {form.formState.errors.scoreThreshold?.message}
        </FormMessage>
      </FormItem>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Zrušit
        </Button>
        <Button type="submit" disabled={createMutation.isLoading}>
          {createMutation.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Vytvářím...
            </>
          ) : (
            "Vytvořit profil"
          )}
        </Button>
      </div>
    </form>
  );
}
