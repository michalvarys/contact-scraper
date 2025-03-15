import { JsonEditor } from "json-edit-react";
import { Code } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@radix-ui/react-accordion";
import { UpdateCompanyData } from "@contact-scraper/api/routers";

export function JSONAccordion() {
    const { control, formState: { errors } } = useFormContext<UpdateCompanyData>()
    return (

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="data">
                <AccordionTrigger className="flex items-center">
                    <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span>JSON Data</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="max-h-[300px] overflow-y-auto pt-2">
                        <Controller
                            name="metadata.data"
                            control={control}
                            defaultValue={'{}'}
                            rules={{
                                validate: (value) => {
                                    try {
                                        JSON.parse(value!);
                                        return true;
                                    } catch (error) {
                                        return 'Neplatná data';
                                    }
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <JsonEditor
                                    data={JSON.parse(value || '{}')}
                                    setData={(data) => onChange(JSON.stringify(data))}
                                />
                            )}
                        />
                        {errors.metadata?.data && (
                            <p className="text-red-500 text-xs mt-1">{errors.metadata.data.message}</p>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}