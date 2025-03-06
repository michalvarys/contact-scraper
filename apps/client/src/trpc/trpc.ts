import type { AppRouter } from '@contact-scraper/api';
import { createTRPCReact } from '@trpc/react-query';

// Define the type for trpc variable
type TRPCHooks = ReturnType<typeof createTRPCReact<AppRouter>>;

export const trpc: TRPCHooks = createTRPCReact<AppRouter>();
