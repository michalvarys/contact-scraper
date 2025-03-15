import Button from "@/components/atoms/Button";
import { useToast } from "@/hooks";
import { trpc } from "@/trpc/trpc";
import { UpdateCompanyData } from "@contact-scraper/api/routers"
import { MailSearch } from "lucide-react";
import { useFormContext } from "react-hook-form"

export function ScrapeEmailButton() {
    const { toast } = useToast()
    const { watch, getValues, setValue, } = useFormContext<UpdateCompanyData>()

    const email = watch('email');
    const web = watch('website');

    const getEmailMutation = trpc.scraper.getEmailFromWebsite.useMutation();

    const handleScrapeEmail = async () => {
        // Funkce zatím prázdná - získání emailu z webové stránky
        const website = getValues('website');
        if (!website) { return; }
        try {
            console.log('Získat email z webu:', website);
            const email = await getEmailMutation.mutateAsync({ url: website });

            if (!email) {
                throw new Error('Bez emailu')
            }

            // Zde by byla implementace získání emailu z webu
            setValue('email', email);

            toast({
                title: 'Email nalezen',
                description: 'Email byl nalezen na webu',
                variant: 'success',
            })

        } catch (err) {
            toast({
                title: 'Chyba',
                description: 'Nelze získat email z webu',
                variant: 'destructive',
            })
        }
    };

    return (

        <Button
            disabled={!web || !!email}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2"
            title="Získat email z webu"
            onClick={handleScrapeEmail}
        >
            <MailSearch className="h-4 w-4" />
        </Button>
    )
}