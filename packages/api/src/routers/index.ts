import { router } from '../trpc';
import { userRouter } from './user';
import { authRouter } from './auth';
import { companyRouter } from './company/route';
import { scraperRouter } from './scraper';
import { icpRouter } from './icp';

export const appRouter = router({
  user: userRouter,
  auth: authRouter,
  company: companyRouter,
  scraper: scraperRouter,
  icp: icpRouter,
});

export type AppRouter = typeof appRouter;

export * from './company';
