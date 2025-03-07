import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import { BusinessTable } from "@/components/BusinessTable";

// src/app/page.tsx
export default async function Home() {
  const helpers = await createSSRHelper()
  await helpers.company.getCompanies.prefetch({ limit: '20', page: '1' });

  return (
    <Hydrate state={dehydrate(helpers.queryClient)}>
      <main className="container-fluid mx-auto p-4 overflow-hidden max-h-screen">
        <h1 className="text-3xl font-bold mb-6">Firemní databáze</h1>
        <BusinessTable />
      </main>
    </Hydrate>
  );
}
