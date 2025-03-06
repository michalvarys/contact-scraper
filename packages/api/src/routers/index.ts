import { router } from '../trpc';
import { userRouter } from './user';
import { authRouter } from './auth';
import { companyRouter } from './company/route';

export const appRouter = router({
  user: userRouter,
  auth: authRouter,
  company: companyRouter,
});

export type AppRouter = typeof appRouter;
