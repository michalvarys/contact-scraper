import SuperJSON from 'superjson';
import { httpBatchLink } from '@trpc/client';
import { createTRPCProxyClient } from '@trpc/client';
import type { AppRouter } from '@contact-scraper/api';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { appRouter } from '@contact-scraper/api/routers';
import { prisma } from '@contact-scraper/db';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export const trpcServer = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
    }),
  ],
});

export const createSSRHelper = async () =>
  createServerSideHelpers({
    router: appRouter,
    transformer: SuperJSON,
    ctx: {
      prisma,
      user: {
        id: '1',
        name: 'John Doe',
        email: 'X2s7V@example.com',
      },
      // session: await auth(),
    },
  });
