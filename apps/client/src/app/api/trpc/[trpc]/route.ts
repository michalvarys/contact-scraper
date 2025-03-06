import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@contact-scraper/api/routers';
import { createContext } from '@contact-scraper/api/context';

// TODO: not necessary, but do not delete yet!
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
