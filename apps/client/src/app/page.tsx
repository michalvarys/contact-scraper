import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import BusinessListPage from "@/sections/main/BusinessListPage"
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

// src/app/page.tsx
export default async function Home() {
  const helpers = await createSSRHelper()
  await helpers.company.getCompanies.prefetch({ limit: '20', page: '1' });

  return (
    <Hydrate state={dehydrate(helpers.queryClient)}>
      <main className="container-fluid mx-auto p-4 overflow-hidden max-h-screen">
        <Suspense fallback={
          <div className="container py-10 flex items-center justify-center min-h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }>
          <BusinessListPage />
        </Suspense>
      </main>
    </Hydrate>
  );
}
