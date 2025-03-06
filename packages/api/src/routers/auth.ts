import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../index';
import {
  loginSchema,
  registerSchema,
  generateToken,
  hashPassword,
  comparePassword,
} from '@contact-scraper/auth';

export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
    const { email, password, name } = input;

    // Kontrola, zda uživatel již existuje
    const existingUser = await ctx.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Uživatel s tímto emailem již existuje',
      });
    }

    // Vytvoření nového uživatele
    const hashedPassword = await hashPassword(password);
    const user = await ctx.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generování tokenu
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const { email, password } = input;

    // Vyhledání uživatele
    const user = await ctx.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Uživatel s tímto emailem nebyl nalezen',
      });
    }

    // Ověření hesla
    const validPassword = await comparePassword(password, user.password);

    if (!validPassword) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Nesprávné heslo',
      });
    }

    // Generování tokenu
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }),
});
