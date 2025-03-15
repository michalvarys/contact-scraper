import Button from "@/components/atoms/Button";
import { useToast } from "@/hooks";
import { UpdateCompanyData } from "@contact-scraper/api/routers";
import { ExternalLink } from "lucide-react";
import { useFormContext } from "react-hook-form";

export function VisitWebsiteButton() {
    const { toast } = useToast()
    const { watch, getValues, setValue, } = useFormContext<UpdateCompanyData>()

    const email = watch('email');
    const web = watch('website');
    return (
        <Button
            disabled={!web}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2"
            title="Získat email z webu"
            onClick={() => web && window.open(web, '_blank')}
        >
            <ExternalLink className="h-4 w-4" />
        </Button>
    )
}