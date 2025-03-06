import { z } from 'zod';
import { protectedProcedure, router } from '../index';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });

    // Nevrátit heslo
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    return null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "Name can't be empty")
          .max(50, "Name can't be longer than 50 characters")
          .nonempty("Name can't be empty"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
        },
      });

      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    }),
});
