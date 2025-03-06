import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@contact-scraper/db';
import { verifyToken } from '@contact-scraper/auth';

interface ContextUser {
  id: string;
  email: string;
  name?: string;
}

export interface Context {
  prisma: typeof prisma;
  user: ContextUser | null;
}

export async function createContext(
  opts: FetchCreateContextFnOptions | CreateNextContextOptions,
): Promise<Context> {
  let user: ContextUser | null = null;

  // Pro zpracování různých typů požadavků (fetch nebo next)
  const req = 'req' in opts ? opts.req : (opts as any).request;
  const authHeader = req.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      const userData = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (userData) {
        const { password, ...userWithoutPassword } = userData;
        user = userWithoutPassword as ContextUser;
      }
    }
  }

  return {
    prisma,
    user,
  };
}
