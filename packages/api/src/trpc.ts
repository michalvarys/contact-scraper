import { initTRPC, TRPCError } from '@trpc/server';
import type { User } from '@contact-scraper/auth';
import { prisma } from '@contact-scraper/db';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from './routers';

// import { OpenApiMeta } from 'trpc-openapi';

// Definice kontextu
interface Context {
  prisma: typeof prisma;
  user: User | null;
}

// Inicializace tRPC
const t = initTRPC.context<Context>().create();
// const t = initTRPC.meta<OpenApiMeta>().create();

export const middleware = t.middleware;
export const router = t.router;
export const procedure = t.procedure;

// Middleware pro autentikaci
export const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Procedury
export const publicProcedure = procedure;
export const protectedProcedure = procedure.use(isAuthenticated);

export type { Context };

export type TrpcRouterOutput = inferRouterOutputs<AppRouter>;
