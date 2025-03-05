"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Vytvoření instance QueryClient
const queryClient = new QueryClient();

export function QueryClientLayout({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}