import { router } from '../trpc';
import { userRouter } from './user';
import { authRouter } from './auth';
import { companyRouter } from './company/route';
import { scraperRouter } from './scraper';

export const appRouter = router({
  user: userRouter,
  auth: authRouter,
  company: companyRouter,
  scraper: scraperRouter,
});

export type AppRouter = typeof appRouter;

export * from './company';
