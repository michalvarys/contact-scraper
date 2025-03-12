import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import DuplicateBusinessListPage from "@/pages/main/DuplicateBusinessListPage";

export default async function DuplicatesPage() {
    const helpers = await createSSRHelper();

    // Předvyplnění dat pro stránku s duplicitami
    // Nastavíme výchozí filtr pro duplicity (email)
    await helpers.company.getCompanies.prefetch({
        limit: '20',
        page: '1',
        duplicates: 'email'
    });

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <main className="container-fluid mx-auto p-4 overflow-hidden max-h-screen">
                <DuplicateBusinessListPage />
            </main>
        </Hydrate>
    );
}
