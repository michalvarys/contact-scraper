"use server";
import { createSSRHelper } from "@/trpc/server";
import Hydrate from "@/trpc/dydrate";
import { dehydrate } from "@tanstack/react-query";
import IcpDetailPage from "@/sections/icp/IcpDetailPage";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default async function IcpDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const helpers = await createSSRHelper();
    await helpers.icp.get.prefetch({ id });

    return (
        <Hydrate state={dehydrate(helpers.queryClient)}>
            <Suspense fallback={
                <div className="container py-10 flex items-center justify-center min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            }>
                <IcpDetailPage id={id} />
            </Suspense>
        </Hydrate>
    );
}
