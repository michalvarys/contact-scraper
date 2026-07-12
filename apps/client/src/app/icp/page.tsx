"use server";
import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import IcpListPage from "@/sections/icp/IcpListPage";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default async function IcpPage() {
    const helpers = await createSSRHelper();
    await helpers.icp.list.prefetch();

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <Suspense fallback={
                <div className="container py-10 flex items-center justify-center min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            }>
                <IcpListPage />
            </Suspense>
        </Hydrate>
    );
}
