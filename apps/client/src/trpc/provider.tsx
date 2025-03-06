'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';
import { createQueryClient } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    // Použití funkce z client.ts pro vytvoření QueryClient
    const [queryClient] = useState(() => createQueryClient());

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    headers() {
                        let headers = {};

                        // Přidání autentikačního tokenu, pokud existuje
                        if (typeof window !== 'undefined') {
                            const token = localStorage.getItem('token');
                            if (token) {
                                headers = {
                                    ...headers,
                                    Authorization: `Bearer ${token}`,

                                };
                            }
                        }

                        return headers;
                    },
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
